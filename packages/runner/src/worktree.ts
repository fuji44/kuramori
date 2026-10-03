import { join, resolve } from '@std/path';

export interface WorktreeSession {
  worktreePath: string;
  cleanup: () => Promise<void>;
}

export class WorktreeManager {
  private readonly baseCacheDir: string;
  private readonly baseWorktreeDir: string;
  private readonly cloneLocks = new Map<string, Promise<string>>();
  private readonly fetchLocks = new Map<string, Promise<void>>();

  constructor(baseCacheDir: string, baseWorktreeDir: string) {
    this.baseCacheDir = resolve(baseCacheDir);
    this.baseWorktreeDir = resolve(baseWorktreeDir);
  }

  protected getCloneUrl(repository: string): string {
    return `https://github.com/${repository}.git`;
  }

  private async runGit(args: string[], cwd?: string): Promise<string> {
    const cmd = new Deno.Command('git', {
      args,
      cwd,
      stdout: 'piped',
      stderr: 'piped',
    });
    const output = await cmd.output();
    if (!output.success) {
      const errorText = new TextDecoder().decode(output.stderr);
      throw new Error(`git ${args.join(' ')} failed: ${errorText}`);
    }
    return new TextDecoder().decode(output.stdout).trim();
  }

  private validateRepository(repository: string): void {
    const REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    if (!REPO_REGEX.test(repository)) {
      throw new Error(`Invalid repository format: ${repository}`);
    }
  }

  protected async ensureBareRepo(repository: string): Promise<string> {
    this.validateRepository(repository);
    const existingLock = this.cloneLocks.get(repository);
    if (existingLock) {
      return await existingLock;
    }

    const lockPromise = (async () => {
      const repoDirName = repository.replace('/', '__');
      const repoPath = join(this.baseCacheDir, repoDirName);

      try {
        const stat = await Deno.stat(repoPath);
        if (stat.isDirectory) {
          try {
            await this.runGit(['rev-parse', '--git-dir'], repoPath);
            return repoPath;
          } catch {
            await Deno.remove(repoPath, { recursive: true });
          }
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
          throw err;
        }
      }

      await Deno.mkdir(this.baseCacheDir, { recursive: true });
      const cloneUrl = this.getCloneUrl(repository);
      const tempClonePath = `${repoPath}.tmp-${crypto.randomUUID()}`;
      try {
        await this.runGit(['clone', '--bare', cloneUrl, tempClonePath]);
        await Deno.rename(tempClonePath, repoPath);
      } catch (cloneErr) {
        try {
          await Deno.remove(tempClonePath, { recursive: true });
        } catch {
          // ignore cleanup error
        }
        try {
          await this.runGit(['rev-parse', '--git-dir'], repoPath);
          return repoPath;
        } catch {
          throw cloneErr;
        }
      }
      return repoPath;
    })();

    this.cloneLocks.set(repository, lockPromise);
    try {
      return await lockPromise;
    } finally {
      this.cloneLocks.delete(repository);
    }
  }

  async prepareWorktree(repository: string, prNumber: number, headSha: string): Promise<WorktreeSession> {
    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      throw new Error(`Invalid PR number: ${prNumber}`);
    }
    if (headSha && !/^[a-zA-Z0-9_.-]+$/.test(headSha)) {
      throw new Error(`Invalid headSha: ${headSha}`);
    }
    const repoPath = await this.ensureBareRepo(repository);
    const branchName = `pr-${prNumber}`;

    // 同一 PR への並行 fetch 競合を防止（同一PRはfetchLocksで直列化しref lock衝突を防ぐ）
    const fetchKey = `${repository}#${prNumber}`;
    const existingFetch = this.fetchLocks.get(fetchKey);
    if (existingFetch) {
      await existingFetch;
    } else {
      const fetchPromise = (async () => {
        // 各 PR 固有のブランチ参照へ fetch することで別 PR 間での FETCH_HEAD 競合を防止
        await this.runGit(['fetch', 'origin', `pull/${prNumber}/head:${branchName}`, '--force'], repoPath);
      })();
      this.fetchLocks.set(fetchKey, fetchPromise);
      try {
        await fetchPromise;
      } finally {
        this.fetchLocks.delete(fetchKey);
      }
    }

    const safeRepoName = repository.replace('/', '__');
    const timestamp = Date.now();
    const suffix = crypto.randomUUID().slice(0, 8);
    const worktreePath = join(this.baseWorktreeDir, safeRepoName, `pr-${prNumber}-${timestamp}-${suffix}`);

    await Deno.mkdir(join(this.baseWorktreeDir, safeRepoName), { recursive: true });

    try {
      await this.runGit(['worktree', 'add', '--detach', worktreePath, headSha || branchName], repoPath);
    } catch (err) {
      try {
        await this.runGit(['worktree', 'remove', '--force', worktreePath], repoPath);
      } catch {
        // ignore fallback
      }
      try {
        await Deno.remove(worktreePath, { recursive: true });
      } catch {
        // ignore fallback
      }
      throw err;
    }

    const cleanup = async () => {
      try {
        await this.runGit(['worktree', 'remove', '--force', worktreePath], repoPath);
      } catch (err) {
        console.error('Failed to remove worktree cleanly', { worktreePath, err });
        try {
          await Deno.remove(worktreePath, { recursive: true });
        } catch {
          // ignore fallback removal error
        }
      }
    };

    return {
      worktreePath,
      cleanup,
    };
  }
}
