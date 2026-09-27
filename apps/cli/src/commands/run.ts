import { Command, EnumType } from '@cliffy/command';
import { runCli } from '../../../../packages/runner/src/cli.ts';

const engineType = new EnumType(['claude-code', 'antigravity', 'codex', 'mock']);

export function createRunCommand() {
  return new Command()
    .type('engine', engineType)
    .description('Execute automated review for a pull request.')
    .option('-r, --repo <owner/repo:string>', 'GitHub repository (e.g. octocat/Hello-World)', { required: true })
    .option('-p, --pr <number:integer>', 'Pull request number', { required: true })
    .option('--head-sha <sha:string>', 'Target head SHA')
    .option('-o, --output-dir <dir:string>', 'Output directory for review artifacts (default: XDG data directory)')
    .option('--engine <engine:engine>', 'Engine to use', { default: 'claude-code' })
    .option('-m, --model <name:string>', 'Model name (e.g. claude-3-5-sonnet, ornith-1.5:9b)')
    .option('--max-turns <turns:integer>', 'Max agent turns limit')
    .option('--cache-dir <dir:string>', 'Bare git cache directory (default: XDG cache directory)')
    .option('--worktree-dir <dir:string>', 'Temporary worktree directory (default: XDG cache directory)')
    .action(async (options) => {
      const rawArgs: string[] = [
        '--repo', options.repo,
        '--pr', options.pr.toString(),
        '--engine', options.engine,
      ];

      if (options.cacheDir !== undefined) {
        rawArgs.push('--cache-dir', options.cacheDir);
      }
      if (options.worktreeDir !== undefined) {
        rawArgs.push('--worktree-dir', options.worktreeDir);
      }
      if (options.headSha !== undefined) {
        rawArgs.push('--head-sha', options.headSha);
      }
      if (options.outputDir !== undefined) {
        rawArgs.push('--output-dir', options.outputDir);
      }
      if (options.model !== undefined) {
        rawArgs.push('--model', options.model);
      }
      if (options.maxTurns !== undefined) {
        rawArgs.push('--max-turns', options.maxTurns.toString());
      }

      await runCli(rawArgs);
    });
}
