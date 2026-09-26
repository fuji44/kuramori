import { join, resolve } from '@std/path';

export interface WorktreeSession {
  worktreePath: string;
  cleanup: () => Promise<void>;
}

export class WorktreeManager {
  private readonly baseCacheDir: string;
  private readonly baseWorktreeDir: string;

  constructor(baseCacheDir: string, baseWorktreeDir: string) {
    this.baseCacheDir = resolve(baseCacheDir);
    this.baseWorktreeDir = resolve(baseWorktreeDir);
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

  protected async ensureBareRepo(repository: string): Promise<string> {
    const repoDirName = repository.replace('/', '__');
    const repoPath = join(this.baseCacheDir, repoDirName);

    try {
      const stat = await Deno.stat(repoPath);
      if (stat.isDirectory) {
        return repoPath;
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) {
        throw err;
      }
    }

    await Deno.mkdir(this.baseCacheDir, { recursive: true });
    const cloneUrl = `https://github.com/${repository}.git`;
    await this.runGit(['clone', '--bare', cloneUrl, repoPath]);
    return repoPath;
  }

  async prepareWorktree(repository: string, prNumber: number, headSha: string): Promise<WorktreeSession> {
    const repoPath = await this.ensureBareRepo(repository);
    const branchName = `pr-${prNumber}`;

    await this.runGit(['fetch', 'origin', `pull/${prNumber}/head:${branchName}`, '--force'], repoPath);

    const safeRepoName = repository.replace('/', '__');
    const timestamp = Date.now();
    const worktreePath = join(this.baseWorktreeDir, safeRepoName, `pr-${prNumber}-${timestamp}`);

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
