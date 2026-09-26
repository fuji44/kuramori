import { assertEquals } from 'jsr:@std/assert@^1.0.11';
import { join } from 'node:path';
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
  } finally {
    await Deno.remove(tempBase, { recursive: true });
  }
});
