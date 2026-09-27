import { parseArgs } from '@std/cli/parse-args';
import { join, resolve } from '@std/path';
import { WorktreeManager } from './worktree.ts';
import { ClaudeCodeEngine } from './engines/claude-code.ts';
import { AntigravityEngine } from './engines/antigravity.ts';
import { MockReviewEngine } from './engines/mock.ts';
import { CodexEngine } from './engines/codex.ts';
import type { ReviewEngine } from '@kuramori/core';

export async function runCli(rawArgs: string[] = Deno.args) {
  const args = parseArgs(rawArgs, {
    string: [
      'repo',
      'pr',
      'head-sha',
      'output-dir',
      'engine',
      'cache-dir',
      'worktree-dir',
      'model',
      'max-turns',
    ],
    boolean: ['help'],
    alias: {
      r: 'repo',
      p: 'pr',
      o: 'output-dir',
      h: 'help',
      m: 'model',
    },
  });

  if (args.help || !args.repo || !args.pr) {
    console.log(`
Usage: kuramori run [options]

Options:
  -r, --repo <owner/repo>     GitHub repository (required)
  -p, --pr <number>           Pull request number (required)
      --head-sha <sha>        Target head SHA (optional)
  -o, --output-dir <dir>      Output directory for review artifacts (default: ./data/reports/<pr>)
      --engine <name>         Engine to use (default: claude-code)
  -m, --model <name>          Model name (e.g. ornith-1.5:9b, claude-3-5-sonnet-20241022)
      --max-turns <number>    Max agent turns limit
      --cache-dir <dir>       Bare git cache directory (default: ./data/cache)
      --worktree-dir <dir>    Temporary worktree directory (default: ./.worktrees)
  -h, --help                  Show this help message
`);
    Deno.exit(args.help ? 0 : 1);
  }

  const repository = args.repo;
  const prNumber = parseInt(args.pr, 10);
  if (isNaN(prNumber)) {
    console.error('Invalid PR number:', args.pr);
    Deno.exit(1);
  }

  const cacheDir = resolve(args['cache-dir'] ?? './data/cache');
  const worktreeBaseDir = resolve(args['worktree-dir'] ?? './.worktrees');
  const outputDir = resolve(args['output-dir'] ?? join('./data/reports', `${repository.replace('/', '__')}_${prNumber}`));

  await Deno.mkdir(outputDir, { recursive: true });

  const worktreeManager = new WorktreeManager(cacheDir, worktreeBaseDir);

  console.log(`Preparing worktree for ${repository}#${prNumber}...`);
  const session = await worktreeManager.prepareWorktree(repository, prNumber, args['head-sha'] ?? '');

  try {
    console.log(`Worktree ready at: ${session.worktreePath}`);

    let engine: ReviewEngine;
    if (args.engine === 'codex') {
      engine = new CodexEngine();
    } else if (args.engine === 'antigravity') {
      engine = new AntigravityEngine({
        model: args.model,
      });
    } else if (args.engine === 'claude-code' || args.engine === undefined) {
      engine = new ClaudeCodeEngine({
        model: args.model,
        maxTurns: args['max-turns'] ? parseInt(args['max-turns'], 10) : undefined,
      });
    } else if (args.engine === 'mock') {
      engine = new MockReviewEngine();
    } else {
      console.error(`Unsupported engine: ${args.engine}`);
      Deno.exit(1);
    }

    const jobId = crypto.randomUUID();
    const logPath = join(outputDir, `${jobId}.log`);

    console.log(`Executing review with engine: ${engine.name}...`);
    const result = await engine.execute({
      jobId,
      requestId: `${repository}#${prNumber}`,
      repository,
      number: prNumber,
      headSha: args['head-sha'] ?? '',
      worktreePath: session.worktreePath,
      outputDir,
      logPath,
    });

    if (result.success) {
      console.log('Review completed successfully!', { reportPath: result.reportHtmlPath });
    } else {
      console.error('Review execution failed:', result.error);
      Deno.exit(1);
    }
  } finally {
    console.log('Cleaning up temporary worktree...');
    await session.cleanup();
  }
}

if (import.meta.main) {
  await runCli();
}
