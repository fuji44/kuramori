import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { dirname } from 'node:path';
import * as schema from './schema.ts';

export function createDb(dbUrl: string = 'file:data/review-base.db') {
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
      report_id TEXT
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
}

export type AppDatabase = ReturnType<typeof createDb>['db'];
