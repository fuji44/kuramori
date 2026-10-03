import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { WorktreeManager } from './worktree.ts';

Deno.test('WorktreeManager - prepareWorktree and cleanup with local bare repo', async () => {
  const tempBase = await Deno.makeTempDir({ prefix: 'kuramori-worktree-test-' });
  const cacheDir = join(tempBase, 'cache');
  const worktreeDir = join(tempBase, 'worktrees');
  const originDir = join(tempBase, 'origin.git');

  try {
    const run = async (cmdStr: string, cwd?: string) => {
      const [cmd, ...args] = cmdStr.split(' ');
      const command = new Deno.Command(cmd, { args, cwd, stdout: 'piped', stderr: 'piped' });
      const out = await command.output();
      if (!out.success) {
        throw new Error(`Failed: ${cmdStr}: ${new TextDecoder().decode(out.stderr)}`);
      }
    };

    // 1. Initialize a dummy remote repo with an initial commit
    await Deno.mkdir(originDir, { recursive: true });
    await run('git init --bare', originDir);

    const localClone = join(tempBase, 'local-clone');
    await run(`git clone ${originDir} ${localClone}`);
    await run('git config user.email test@example.com', localClone);
    await run('git config user.name Tester', localClone);

    await Deno.writeTextFile(join(localClone, 'file.txt'), 'hello world');
    await run('git add file.txt', localClone);
    await run('git commit -m initial-commit', localClone);
    await run('git branch -M main', localClone);
    await run('git push origin main', localClone);

    // Push simulated PR ref: refs/pull/42/head
    await run('git checkout -b feat/test', localClone);
    await Deno.writeTextFile(join(localClone, 'file.txt'), 'pr changes');
    await run('git commit -am pr-commit', localClone);
    await run('git push origin feat/test:refs/pull/42/head', localClone);

    // 2. Clone bare repo into cacheDir with remote origin set to originDir
    const repoPath = join(cacheDir, 'test__repo');
    await Deno.mkdir(cacheDir, { recursive: true });
    await run(`git clone --bare ${originDir} ${repoPath}`);

    const manager = new WorktreeManager(cacheDir, worktreeDir);
    const session = await manager.prepareWorktree('test/repo', 42, '');

    // Verify worktree exists and contains the PR file
    const content = await Deno.readTextFile(join(session.worktreePath, 'file.txt'));
    assertEquals(content, 'pr changes');

    // Verify cleanup
    await session.cleanup();
    let existsAfterCleanup = false;
    try {
      await Deno.stat(session.worktreePath);
      existsAfterCleanup = true;
    } catch {
      existsAfterCleanup = false;
    }
    assertEquals(existsAfterCleanup, false);

    // 3. Verify concurrent prepareWorktree produces unique paths and handles cleanup
    const [session1, session2] = await Promise.all([
      manager.prepareWorktree('test/repo', 42, ''),
      manager.prepareWorktree('test/repo', 42, ''),
    ]);
    assertEquals(session1.worktreePath !== session2.worktreePath, true);
    await session1.cleanup();
    await session2.cleanup();
  } finally {
    await Deno.remove(tempBase, { recursive: true });
  }
});

class TestWorktreeManager extends WorktreeManager {
  private readonly customOrigin: string;
  constructor(baseCacheDir: string, baseWorktreeDir: string, customOrigin: string) {
    super(baseCacheDir, baseWorktreeDir);
    this.customOrigin = customOrigin;
  }
  protected override getCloneUrl(_repository: string): string {
    return this.customOrigin;
  }
}

Deno.test('WorktreeManager - concurrent initial clone handles lock and atomic rename without pre-cloning', async () => {
  const tempBase = await Deno.makeTempDir({ prefix: 'kuramori-clone-lock-test-' });
  const cacheDir = join(tempBase, 'cache');
  const worktreeDir = join(tempBase, 'worktrees');
  const originDir = join(tempBase, 'origin.git');

  try {
    const run = async (cmdStr: string, cwd?: string) => {
      const [cmd, ...args] = cmdStr.split(' ');
      const command = new Deno.Command(cmd, { args, cwd, stdout: 'piped', stderr: 'piped' });
      const out = await command.output();
      if (!out.success) {
        throw new Error(`Failed: ${cmdStr}: ${new TextDecoder().decode(out.stderr)}`);
      }
    };

    await Deno.mkdir(originDir, { recursive: true });
    await run('git init --bare', originDir);

    const localClone = join(tempBase, 'local-clone');
    await run(`git clone ${originDir} ${localClone}`);
    await run('git config user.email test@example.com', localClone);
    await run('git config user.name Tester', localClone);
    await Deno.writeTextFile(join(localClone, 'file.txt'), 'pr 99 content');
    await run('git add file.txt', localClone);
    await run('git commit -m pr-99', localClone);
    await run('git push origin HEAD:refs/pull/99/head', localClone);

    // 事前クローンを行わず、空の cacheDir から同時に並行実行
    const manager = new TestWorktreeManager(cacheDir, worktreeDir, originDir);
    const [s1, s2] = await Promise.all([
      manager.prepareWorktree('test/repo', 99, ''),
      manager.prepareWorktree('test/repo', 99, ''),
    ]);

    assertEquals(s1.worktreePath !== s2.worktreePath, true);
    const c1 = await Deno.readTextFile(join(s1.worktreePath, 'file.txt'));
    const c2 = await Deno.readTextFile(join(s2.worktreePath, 'file.txt'));
    assertEquals(c1, 'pr 99 content');
    assertEquals(c2, 'pr 99 content');

    await s1.cleanup();
    await s2.cleanup();
  } finally {
    await Deno.remove(tempBase, { recursive: true });
  }
});

Deno.test('WorktreeManager - auto-heals corrupted bare repo cache on prepareWorktree', async () => {
  const tempBase = await Deno.makeTempDir({ prefix: 'kuramori-heal-test-' });
  const cacheDir = join(tempBase, 'cache');
  const worktreeDir = join(tempBase, 'worktrees');
  const originDir = join(tempBase, 'origin.git');

  try {
    const run = async (cmdStr: string, cwd?: string) => {
      const [cmd, ...args] = cmdStr.split(' ');
      const command = new Deno.Command(cmd, { args, cwd, stdout: 'piped', stderr: 'piped' });
      const out = await command.output();
      if (!out.success) {
        throw new Error(`Failed: ${cmdStr}: ${new TextDecoder().decode(out.stderr)}`);
      }
    };

    await Deno.mkdir(originDir, { recursive: true });
    await run('git init --bare', originDir);

    const localClone = join(tempBase, 'local-clone');
    await run(`git clone ${originDir} ${localClone}`);
    await run('git config user.email test@example.com', localClone);
    await run('git config user.name Tester', localClone);
    await Deno.writeTextFile(join(localClone, 'file.txt'), 'pr 77 content');
    await run('git add file.txt', localClone);
    await run('git commit -m pr-77', localClone);
    await run('git push origin HEAD:refs/pull/77/head', localClone);

    // キャッシュディレクトリに「壊れた git ディレクトリ（不完全な空ディレクトリ）」を配置
    const corruptedCachePath = join(cacheDir, 'test__repo');
    await Deno.mkdir(corruptedCachePath, { recursive: true });
    await Deno.writeTextFile(join(corruptedCachePath, 'corrupted.txt'), 'corrupted garbage');

    const manager = new TestWorktreeManager(cacheDir, worktreeDir, originDir);
    const session = await manager.prepareWorktree('test/repo', 77, '');

    // 破損が検知・自己修復され、正常に worktree が準備できることを検証
    const content = await Deno.readTextFile(join(session.worktreePath, 'file.txt'));
    assertEquals(content, 'pr 77 content');

    await session.cleanup();
  } finally {
    await Deno.remove(tempBase, { recursive: true });
  }
});
