import { assertEquals } from '@std/assert';
import { resolveKuramoriPaths } from './paths.ts';

Deno.test('resolveKuramoriPaths - returns valid absolute paths', async () => {
  const paths = await resolveKuramoriPaths();

  assertEquals(typeof paths.dataDir, 'string');
  assertEquals(paths.dataDir.includes('kuramori'), true);
  assertEquals(paths.databaseFile.endsWith('kuramori.db'), true);
  assertEquals(paths.reportsDir.endsWith('reports'), true);
  assertEquals(paths.logsDir.endsWith('logs'), true);
  assertEquals(paths.cacheDir.includes('kuramori'), true);
  assertEquals(paths.gitCacheDir.endsWith('cache'), true);
  assertEquals(paths.worktreeDir.endsWith('worktrees'), true);
});

Deno.test('resolveKuramoriPaths - respects overrides', async () => {
  const customData = '/tmp/custom-data';
  const customCache = '/tmp/custom-cache';
  const paths = await resolveKuramoriPaths({
    dataDir: customData,
    cacheDir: customCache,
  });

  assertEquals(paths.dataDir.includes('custom-data'), true);
  assertEquals(paths.cacheDir.includes('custom-cache'), true);
});
