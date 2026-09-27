import { dir } from '@cross/dir';
import { join, resolve } from '@std/path';

export interface KuramoriPaths {
  dataDir: string;
  databaseFile: string;
  reportsDir: string;
  logsDir: string;
  cacheDir: string;
  gitCacheDir: string;
  worktreeDir: string;
  configDir: string;
}

export interface KuramoriPathOverrides {
  dataDir?: string;
  cacheDir?: string;
  configDir?: string;
  databaseFile?: string;
  reportsDir?: string;
  worktreeDir?: string;
  gitCacheDir?: string;
}

export async function resolveKuramoriPaths(
  overrides?: KuramoriPathOverrides,
): Promise<KuramoriPaths> {
  const homeDir = (await dir('home')) ?? '.';

  const rawDataRoot = overrides?.dataDir ??
    Deno.env.get('KURAMORI_DATA_DIR') ??
    (await dir('data')) ??
    join(homeDir, '.local', 'share');
  const dataDir = resolve(join(rawDataRoot, 'kuramori'));

  const rawCacheRoot = overrides?.cacheDir ??
    Deno.env.get('KURAMORI_CACHE_DIR') ??
    (await dir('cache')) ??
    join(homeDir, '.cache');
  const cacheDir = resolve(join(rawCacheRoot, 'kuramori'));

  const rawConfigRoot = overrides?.configDir ??
    Deno.env.get('KURAMORI_CONFIG_DIR') ??
    (await dir('config')) ??
    join(homeDir, '.config');
  const configDir = resolve(join(rawConfigRoot, 'kuramori'));

  const databaseUrlEnv = Deno.env.get('DATABASE_URL');
  let databaseFile: string;
  if (overrides?.databaseFile !== undefined) {
    databaseFile = overrides.databaseFile;
  } else if (databaseUrlEnv !== undefined && databaseUrlEnv.startsWith('file:')) {
    databaseFile = resolve(databaseUrlEnv.slice(5));
  } else {
    databaseFile = join(dataDir, 'kuramori.db');
  }

  const reportsDir = resolve(
    overrides?.reportsDir ??
      Deno.env.get('REPORTS_DIR') ??
      join(dataDir, 'reports'),
  );

  const logsDir = join(dataDir, 'logs');
  const gitCacheDir = resolve(overrides?.gitCacheDir ?? join(cacheDir, 'cache'));
  const worktreeDir = resolve(overrides?.worktreeDir ?? join(cacheDir, 'worktrees'));

  return {
    dataDir,
    databaseFile,
    reportsDir,
    logsDir,
    cacheDir,
    gitCacheDir,
    worktreeDir,
    configDir,
  };
}

export async function ensureKuramoriDirectories(paths: KuramoriPaths): Promise<void> {
  const dirs = [
    paths.dataDir,
    paths.reportsDir,
    paths.logsDir,
    paths.cacheDir,
    paths.gitCacheDir,
    paths.worktreeDir,
    paths.configDir,
  ];

  for (const directory of dirs) {
    try {
      await Deno.mkdir(directory, { recursive: true });
    } catch {
      // Directory already exists or cannot be created
    }
  }
}
