import { Command } from '@cliffy/command';
import { bootstrap } from '../../../server/src/index.ts';

export function createServeCommand() {
  return new Command()
    .description('Start the kuramori server (API, background review queue, and web UI).')
    .option('-p, --port <port:number>', 'Server port', {
      default: parseInt(Deno.env.get('PORT') ?? '3456', 10),
    })
    .option('-H, --host <hostname:string>', 'Host address to bind', {
      default: Deno.env.get('HOST') ?? '127.0.0.1',
    })
    .option('--db <url:string>', 'SQLite database URL (default: XDG data directory)')
    .option('--reports-dir <dir:string>', 'Directory for review reports (default: XDG data directory)')
    .option('--cache-dir <dir:string>', 'Directory for git cache (default: XDG cache directory)')
    .option('--worktree-dir <dir:string>', 'Directory for worktrees (default: XDG cache directory)')
    .action(async (options) => {
      await bootstrap({
        port: options.port,
        hostname: options.host,
        dbUrl: options.db,
        reportsDir: options.reportsDir,
        cacheDir: options.cacheDir,
        worktreeDir: options.worktreeDir,
      });
    });
}
