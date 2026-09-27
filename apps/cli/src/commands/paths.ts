import { Command } from '@cliffy/command';
import { resolveKuramoriPaths, ensureKuramoriDirectories } from '@kuramori/core';

export function createPathsCommand() {
  return new Command()
    .description('Display XDG-compliant storage and cache directory paths.')
    .option('--json', 'Output paths in JSON format')
    .option('--data', 'Print data directory path only')
    .option('--cache', 'Print cache directory path only')
    .option('--config', 'Print configuration directory path only')
    .option('--db', 'Print SQLite database file path only')
    .option('--reports', 'Print reports directory path only')
    .option('--worktrees', 'Print worktrees directory path only')
    .option('--init', 'Ensure all directories exist on disk')
    .action(async (options) => {
      const paths = await resolveKuramoriPaths();

      if (options.init) {
        await ensureKuramoriDirectories(paths);
      }

      if (options.json) {
        console.log(JSON.stringify(paths, null, 2));
        return;
      }

      if (options.data) {
        console.log(paths.dataDir);
        return;
      }
      if (options.cache) {
        console.log(paths.cacheDir);
        return;
      }
      if (options.config) {
        console.log(paths.configDir);
        return;
      }
      if (options.db) {
        console.log(paths.databaseFile);
        return;
      }
      if (options.reports) {
        console.log(paths.reportsDir);
        return;
      }
      if (options.worktrees) {
        console.log(paths.worktreeDir);
        return;
      }

      console.log('kuramori Storage Paths (XDG Compliant)\n');
      console.log(`  Data Directory:      ${paths.dataDir}`);
      console.log(`  Database File:       ${paths.databaseFile}`);
      console.log(`  Reports Directory:   ${paths.reportsDir}`);
      console.log(`  Logs Directory:      ${paths.logsDir}`);
      console.log(`  Cache Directory:     ${paths.cacheDir}`);
      console.log(`  Git Cache:           ${paths.gitCacheDir}`);
      console.log(`  Worktrees:           ${paths.worktreeDir}`);
      console.log(`  Config Directory:    ${paths.configDir}`);
    });
}
