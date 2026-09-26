import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { dirname } from '@std/path';
import * as schema from './schema.ts';

export function createDb(dbUrl: string = 'file:data/kuramori.db') {
  if (dbUrl.startsWith('file:')) {
    const filePath = dbUrl.slice(5);
    const dir = dirname(filePath);
    if (dir && dir !== '.') {
      try {
        Deno.mkdirSync(dir, { recursive: true });
      } catch {
        // Already exists
      }
    }
  }

  const client = createClient({ url: dbUrl });
  const db = drizzle(client, { schema });
  return { db, client };
}

export async function initDatabase(client: ReturnType<typeof createClient>) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS review_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      provider TEXT NOT NULL DEFAULT 'github',
      repository TEXT NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      url TEXT NOT NULL,
      source_branch TEXT NOT NULL DEFAULT '',
      target_branch TEXT NOT NULL DEFAULT '',
      head_sha TEXT NOT NULL DEFAULT '',
      is_draft INTEGER NOT NULL DEFAULT 0,
      is_own INTEGER NOT NULL DEFAULT 0,
      labels TEXT,
      milestone TEXT,
      assignees TEXT,
      state TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  try {
    await client.execute('ALTER TABLE review_requests ADD COLUMN is_own INTEGER NOT NULL DEFAULT 0;');
  } catch {
    // Column might already exist
  }

  try {
    await client.execute('ALTER TABLE review_requests ADD COLUMN labels TEXT;');
  } catch {
    // Column might already exist
  }

  try {
    await client.execute('ALTER TABLE review_requests ADD COLUMN milestone TEXT;');
  } catch {
    // Column might already exist
  }

  try {
    await client.execute('ALTER TABLE review_requests ADD COLUMN assignees TEXT;');
  } catch {
    // Column might already exist
  }

  try {
    await client.execute('ALTER TABLE review_requests ADD COLUMN additions INTEGER;');
  } catch {
    // Column might already exist
  }

  try {
    await client.execute('ALTER TABLE review_requests ADD COLUMN deletions INTEGER;');
  } catch {
    // Column might already exist
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS review_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'general',
      engine TEXT NOT NULL DEFAULT 'default',
      instructions TEXT NOT NULL,
      trigger_json TEXT NOT NULL,
      concurrency_json TEXT,
      engine_override_json TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  try {
    await client.execute('ALTER TABLE review_rules ADD COLUMN engine_override_json TEXT;');
  } catch {
    // Column might already exist
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS review_triggers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      repository TEXT NOT NULL,
      paths_json TEXT,
      paths_ignore_json TEXT,
      rule_ids_json TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS review_jobs (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES review_requests(id),
      user_id TEXT NOT NULL DEFAULT 'default',
      status TEXT NOT NULL DEFAULT 'pending',
      engine TEXT NOT NULL DEFAULT 'claude-code',
      started_at TEXT,
      completed_at TEXT,
      error TEXT,
      report_id TEXT,
      rule_id TEXT REFERENCES review_rules(id),
      rule_name TEXT,
      rule_category TEXT,
      head_sha TEXT
    );
  `);

  try {
    await client.execute('ALTER TABLE review_jobs ADD COLUMN rule_id TEXT REFERENCES review_rules(id);');
  } catch {
    // Column might already exist
  }

  try {
    await client.execute('ALTER TABLE review_jobs ADD COLUMN rule_name TEXT;');
  } catch {
    // Column might already exist
  }

  try {
    await client.execute('ALTER TABLE review_jobs ADD COLUMN rule_category TEXT;');
  } catch {
    // Column might already exist
  }

  try {
    await client.execute('ALTER TABLE review_jobs ADD COLUMN head_sha TEXT;');
  } catch {
    // Column might already exist
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS review_rule_results (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES review_jobs(id),
      request_id TEXT NOT NULL REFERENCES review_requests(id),
      rule_id TEXT NOT NULL REFERENCES review_rules(id),
      rule_name TEXT NOT NULL,
      category TEXT NOT NULL,
      head_sha TEXT NOT NULL,
      verdict TEXT NOT NULL,
      summary TEXT NOT NULL,
      findings TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS review_reports (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES review_jobs(id),
      request_id TEXT NOT NULL REFERENCES review_requests(id),
      user_id TEXT NOT NULL DEFAULT 'default',
      summary TEXT,
      verdict TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS pull_filters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      query TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await seedInitialPresets(client);
}

export const INITIAL_PRESET_RULES = [
  {
    id: 'preset-correctness',
    name: 'Correctness & Quality',
    description: '基本ロジック、バグ、エッジケース、回帰リスクの検査',
    category: 'correctness',
    engine: 'default',
    instructions: 'コードの論理的な正確性、エッジケースの考慮漏れ、既存動作の破壊やリグレッションリスクを重点的に精査してください。',
    triggerJson: JSON.stringify({ types: ['opened', 'synchronize'], draft: false }),
    concurrencyJson: JSON.stringify({ cancelInProgress: true }),
    enabled: 1,
  },
  {
    id: 'preset-security',
    name: 'Security Audit',
    description: '脆弱性（インジェクション、認証不備、秘密情報の露出など）に特化した監査',
    category: 'security',
    engine: 'default',
    instructions: 'OWASP Top 10 を含む脆弱性、認証・認可の欠陥、秘密情報のハードコード、入力検証の不備を監査してください。',
    triggerJson: JSON.stringify({
      types: ['opened', 'synchronize'],
      paths: ['**/auth/**', '**/security/**', '**/db/**', '**/api/**', '**/server/**'],
      draft: false,
    }),
    concurrencyJson: JSON.stringify({ cancelInProgress: true }),
    enabled: 1,
  },
  {
    id: 'preset-architecture',
    name: 'Architecture & Design',
    description: '責務境界、依存方向、モジュール深さ、拡張性の検証',
    category: 'architecture',
    engine: 'default',
    instructions: 'モジュール間の責務の明確さ、結合度と凝集度、レイヤー違反、将来的な保守性やテスタビリティを評価してください。',
    triggerJson: JSON.stringify({ types: ['opened', 'ready_for_review'], draft: false }),
    concurrencyJson: JSON.stringify({ cancelInProgress: true }),
    enabled: 1,
  },
];

async function seedInitialPresets(client: ReturnType<typeof createClient>) {
  const now = new Date().toISOString();
  for (const preset of INITIAL_PRESET_RULES) {
    const existing = await client.execute({
      sql: 'SELECT id FROM review_rules WHERE id = ?;',
      args: [preset.id],
    });
    if (existing.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO review_rules (id, name, description, category, engine, instructions, trigger_json, concurrency_json, enabled, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          preset.id,
          preset.name,
          preset.description,
          preset.category,
          preset.engine,
          preset.instructions,
          preset.triggerJson,
          preset.concurrencyJson,
          preset.enabled,
          now,
          now,
        ],
      });
    }
  }

  // デフォルト設定のシード
  const defaultSettings = [
    { key: 'default_rule_id', value: 'preset-correctness' },
    { key: 'default_backend_id', value: 'antigravity' },
    { key: 'global_max_concurrency', value: '2' },
  ];

  for (const s of defaultSettings) {
    const existing = await client.execute({
      sql: 'SELECT key FROM app_settings WHERE key = ?;',
      args: [s.key],
    });
    if (existing.rows.length === 0) {
      await client.execute({
        sql: 'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);',
        args: [s.key, s.value, now],
      });
    }
  }
}

export type AppDatabase = ReturnType<typeof createDb>['db'];
