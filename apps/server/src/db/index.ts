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
    name: 'Correctness & Functional Reliability',
    description: 'Verifies logical correctness, boundary conditions, state invariants, error recovery, and backward compatibility across caller sites.',
    category: 'correctness',
    engine: 'default',
    instructions: `=== 1. SCOPE & OBJECTIVE ===
Verify the logical correctness, state invariants, boundary value handling, and backward compatibility of all changed code against regression risks.

=== 2. KEY SMELLS & FAILURE MODES ===
- [Unhandled Edge Cases & Off-By-One]: Failure to account for empty collections, zero/negative numbers, null/undefined, boundary limits, or off-by-one index traversal.
- [Broken Invariants & State Transitions]: Allowing illegal lifecycle states, corrupted business invariants, or non-deterministic state machine transitions.
- [Swallowed Exceptions & Loss of Diagnostic Context]: Empty catch blocks, suppressing failure states without logging, or discarding stack traces/underlying causes.
- [Caller Site Breakage (Regression)]: Modifying function signatures (adding required parameters or changing return contracts) without updating existing caller sites across the codebase.
- [Resource & Concurrency Hazards]: Unclosed file handles, database connection leaks, unhandled Promise rejections, or race conditions in asynchronous workflows.

=== 3. VERIFICATION PROTOCOL ===
1. Inspect boundary behaviors of changed functions under extreme inputs (zero, null/undefined, empty arrays, timeout/failure paths).
2. Trace all caller sites referencing modified signatures to verify backward compatibility.
3. Validate error-handling paths to ensure diagnostic context is preserved and allocated resources are reliably freed.

=== 4. NOISE FILTER (STRICTLY PROHIBITED) ===
- Do NOT comment on formatting, whitespace, or stylistic nits automated by linters/formatters (ESLint, Prettier, Black, gofmt, etc.).
- Do NOT comment on subjective variable naming or stylistic preferences that satisfy existing codebase conventions.
- Do NOT challenge intentional requirement or business logic changes explicitly described in the PR description or commit messages.`,
    triggerJson: JSON.stringify({
      types: ['opened', 'synchronize', 'ready_for_review'],
      pathsIgnore: ['**/*.md', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/dist/**', '**/build/**', '**/node_modules/**'],
      draft: false,
    }),
    concurrencyJson: JSON.stringify({ cancelInProgress: true }),
    enabled: 1,
  },
  {
    id: 'preset-security',
    name: 'Security & Defensive Engineering',
    description: 'Audits untrusted input validation, authorization boundaries (BOLA/IDOR), injection vulnerabilities, and sensitive data leakage.',
    category: 'security',
    engine: 'default',
    instructions: `=== 1. SCOPE & OBJECTIVE ===
Audit code changes for adherence to secure coding principles, untrusted input validation, robust authorization barriers, and prevention of sensitive data exposure.

=== 2. KEY SMELLS & FAILURE MODES ===
- [Untrusted Input Validation]: Consuming external inputs (HTTP payloads, query parameters, URL path variables, webhooks) without strict schema validation or sanitization before passing to internal handlers or datastores.
- [Injection Vulnerabilities]: Constructing raw queries or commands via unescaped string concatenation (SQL, NoSQL, OS Command, Template, LDAP, or ReDoS regular expressions).
- [Broken Authorization (BOLA / IDOR)]: Operating on resource identifiers (e.g., user IDs, document IDs) without verifying tenant ownership or active session permissions.
- [Sensitive Data Exposure]: Hardcoded credentials, API keys, tokens, encryption secrets, or PII logged in plain text or leaked into external client responses.
- [Insecure Cryptography / Randomness]: Using non-cryptographic pseudo-random number generators for security tokens, or adopting deprecated hashing/encryption algorithms.

=== 3. VERIFICATION PROTOCOL ===
1. Follow data flows from external input sources to datastores or external APIs to verify trust-boundary sanitization.
2. Confirm that all database mutations and command invocations strictly enforce parameterized queries or safe abstractions.
3. Verify that logging and serialization logic actively redact or mask sensitive parameters and credentials.

=== 4. NOISE FILTER (STRICTLY PROHIBITED) ===
- Do NOT flag dummy tokens, mock certificates, or local test credentials located inside test directories or fixtures.
- Do NOT raise complaints regarding internal implementations of third-party frameworks or standard libraries.
- Do NOT post speculative or abstract security concerns without demonstrating a concrete, reproducible vulnerability scenario.`,
    triggerJson: JSON.stringify({
      types: ['opened', 'synchronize', 'ready_for_review'],
      pathsIgnore: ['**/*.md', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/dist/**', '**/build/**', '**/node_modules/**'],
      draft: false,
    }),
    concurrencyJson: JSON.stringify({ cancelInProgress: true }),
    enabled: 1,
  },
  {
    id: 'preset-architecture',
    name: 'Architecture & Modularity Integrity',
    description: 'Evaluates Single Responsibility Principle, layer boundaries, dependency direction, coupling/cohesion, and testability.',
    category: 'architecture',
    engine: 'default',
    instructions: `=== 1. SCOPE & OBJECTIVE ===
Ensure adherence to clean architecture principles, single responsibility, proper dependency direction, loose coupling, high cohesion, and sustainable testability.

=== 2. KEY SMELLS & FAILURE MODES ===
- [Layer Boundary Violations]: Presentation/UI or controller layers directly performing low-level database operations or bypassing core business domain services.
- [Bloated God Modules & Mixed Concerns]: Accumulating unrelated responsibilities inside a single module, class, or function, resulting in multiple divergent reasons to change.
- [Circular Dependencies & Tight Coupling]: Bidirectional module coupling or leaking internal encapsulation details to outside consumers.
- [Shallow / Inappropriate Abstractions]: Forcing inappropriate code reuse purely based on matching structural types across distinct business domains.
- [Untestable Architecture]: Hardcoding external dependencies (system clock, network calls, random generators, database connections) without mechanisms for dependency injection or test substitution.

=== 3. VERIFICATION PROTOCOL ===
1. Validate that newly introduced or modified modules respect established architectural boundaries and point dependencies toward abstractions rather than concrete details.
2. Inspect module interfaces to ensure implementation details remain properly encapsulated behind clear contracts.
3. Assess testability, confirming that critical logic can be exercised independently of heavy external infrastructure.

=== 4. NOISE FILTER (STRICTLY PROHIBITED) ===
- Do NOT enforce subjective architectural dogmas that contradict existing conventions established in the repository.
- Do NOT demand wide refactorings of untouched legacy code outside the direct scope of this Pull Request.
- Do NOT post abstract architecture critiques without offering a clear, concrete design alternative or pattern.`,
    triggerJson: JSON.stringify({
      types: ['opened', 'synchronize', 'ready_for_review'],
      pathsIgnore: ['**/*.md', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/dist/**', '**/build/**', '**/node_modules/**'],
      draft: false,
    }),
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
