import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { desc, eq } from 'drizzle-orm';
import { resolve } from '@std/path';
import type { AppDatabase } from './db/index.ts';
import { pullFiltersTable, reviewJobsTable, reviewReportsTable, reviewRequestsTable, reviewRulesTable, reviewRuleResultsTable, reviewTriggersTable } from './db/schema.ts';

import type {
  EngineEnvironment,
  EngineEnvironmentVariable,
  EngineOverrideConfig,
  ReportStorage,
  VCSProvider,
} from '@kuramori/core';
import type { GitHubPoller } from './poller.ts';
import type { ReviewQueue } from './queue.ts';
import type { AppSettings, SettingsService } from './settings.ts';
import { compileD2ToSvg, generateStandaloneReviewHtml, resolveEngineEnvironment } from '@kuramori/runner';
import { openapiSpec } from './openapi.ts';
import { Scalar } from '@scalar/hono-api-reference';

export interface ApiDependencies {
  db: AppDatabase;
  storage: ReportStorage;
  poller: GitHubPoller;
  queue: ReviewQueue;
  settingsService: SettingsService;
  vcsProvider?: VCSProvider;
  logsDir?: string;
}

function mapCustomEnv(
  env: EngineEnvironment | undefined,
  oldEnv: EngineEnvironment | undefined,
  transform: (entry: string | EngineEnvironmentVariable, old?: string | EngineEnvironmentVariable) => string | EngineEnvironmentVariable,
): EngineEnvironment | undefined {
  if (env === undefined) return undefined;
  const result: EngineEnvironment = {};
  for (const [key, value] of Object.entries(env)) {
    result[key] = transform(value, oldEnv?.[key]);
  }
  return result;
}

function mapEngineEnvironments<T extends Partial<AppSettings>>(
  settings: T,
  transform: (entry: string | EngineEnvironmentVariable, old?: string | EngineEnvironmentVariable) => string | EngineEnvironmentVariable,
  previous?: Partial<AppSettings>,
): T {
  const result = { ...settings };
  if (settings.engineSettings) {
    const es = settings.engineSettings;
    const prevEs = previous?.engineSettings;
    result.engineSettings = {
      ...es,
      antigravity: {
        ...es.antigravity,
        customEnv: mapCustomEnv(es.antigravity.customEnv, prevEs?.antigravity.customEnv, transform),
      },
      claudeCode: {
        ...es.claudeCode,
        customEnv: mapCustomEnv(es.claudeCode.customEnv, prevEs?.claudeCode.customEnv, transform),
      },
      codex: {
        ...es.codex,
        customEnv: mapCustomEnv(es.codex.customEnv, prevEs?.codex.customEnv, transform),
      },
    };
  }
  if (settings.engineProfiles) {
    result.engineProfiles = settings.engineProfiles.map((p) => {
      const oldP = previous?.engineProfiles?.find((cand) => cand.id === p.id);
      if ('customEnv' in p.config) {
        const oldCustomEnv = oldP && 'customEnv' in oldP.config ? oldP.config.customEnv : undefined;
        return {
          ...p,
          config: {
            ...p.config,
            customEnv: mapCustomEnv(p.config.customEnv, oldCustomEnv, transform),
          },
        } as typeof p;
      }
      return p;
    });
  }
  return result;
}

function maskSecretEnvironmentValues<T extends Partial<AppSettings>>(settings: T): T {
  return mapEngineEnvironments(settings, (entry) => {
    if (typeof entry === 'string') return entry;
    if (!entry.secret) return entry;
    return {
      value: '',
      secret: true,
      configured: Boolean(entry.value || entry.configured),
    };
  });
}

function restoreSecretEnvironmentValues<T extends Partial<AppSettings>>(
  settings: T,
  previous?: Partial<AppSettings>,
): T {
  return mapEngineEnvironments(settings, (entry, oldEntry) => {
    if (typeof entry === 'string') return entry;
    const oldObj = typeof oldEntry === 'object' && oldEntry !== null ? oldEntry : undefined;
    const value = entry.secret && entry.value === '' && entry.configured && oldObj?.secret
      ? oldObj.value
      : entry.value;
    const { configured: _configured, ...persisted } = entry;
    return { ...persisted, value };
  }, previous);
}

export function createApi(deps: ApiDependencies) {
  const app = new Hono();

  app.use('*', cors());

  // OpenAPI Specification and Interactive Documentation (Scalar API Reference)
  app.get('/api/openapi.json', (c) => c.json(openapiSpec));
  app.get(
    '/api/doc',
    Scalar({
      url: '/api/openapi.json',
      pageTitle: 'kuramori API Reference',
    }),
  );
  app.get('/openapi.json', (c) => c.redirect('/api/openapi.json'));
  app.get('/doc', (c) => c.redirect('/api/doc'));

  // Current authenticated user profile
  app.get('/api/me', async (c) => {
    if (!deps.vcsProvider?.getCurrentUser) {
      return c.json({ user: null });
    }
    try {
      const user = await deps.vcsProvider.getCurrentUser();
      return c.json({ user });
    } catch (err) {
      console.error('Failed to get current user', { err });
      return c.json({ user: null });
    }
  });
  app.get('/api/user', (c) => c.redirect('/api/me'));

  // List all review requests with their latest review status and report info
  app.get('/api/pulls', async (c) => {
    const stateParam = c.req.query('state');
    const baseQuery = deps.db.select().from(reviewRequestsTable);
    const requests = stateParam
      ? await baseQuery.where(eq(reviewRequestsTable.state, stateParam)).orderBy(desc(reviewRequestsTable.updatedAt))
      : await baseQuery.orderBy(desc(reviewRequestsTable.updatedAt));

    const jobs = await deps.db.select().from(reviewJobsTable);
    const reports = await deps.db.select().from(reviewReportsTable);

    const items = requests.map((req) => {
      const prJobs = jobs.filter((j) => j.requestId === req.id);
      // Latest job by startedAt or created
      const latestJob = prJobs.sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))[0];
      const prReports = reports
        .filter((r) => r.requestId === req.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const report = (latestJob?.reportId ? reports.find((r) => r.id === latestJob.reportId) : undefined)
        ?? (latestJob ? reports.find((r) => r.jobId === latestJob.id) : undefined)
        ?? prReports[0];

      let parsedLabels: Array<{ name: string; color?: string; description?: string }> = [];
      if (req.labels) {
        try {
          parsedLabels = JSON.parse(req.labels);
        } catch {
          // Ignore invalid or corrupted stored JSON labels
        }
      }

      let parsedAssignees: Array<{ login: string; avatarUrl?: string }> = [];
      if (req.assignees) {
        try {
          parsedAssignees = JSON.parse(req.assignees);
        } catch {
          // Ignore invalid or corrupted stored JSON assignees
        }
      }

      return {
        ...req,
        labels: parsedLabels,
        milestone: req.milestone || null,
        assignees: parsedAssignees,
        latestJob: latestJob
          ? {
              id: latestJob.id,
              status: latestJob.status,
              startedAt: latestJob.startedAt,
              completedAt: latestJob.completedAt,
              error: latestJob.error,
            }
          : null,
        report: report
          ? {
              id: report.id,
              summary: report.summary,
              verdict: report.verdict,
              createdAt: report.createdAt,
            }
          : null,
      };
    });

    return c.json({ items });
  });

  // Manual refresh / poll
  app.post('/api/pulls/refresh', async (c) => {
    await deps.poller.poll();
    return c.json({ success: true, message: 'Polled successfully' });
  });

  app.get('/api/pulls/filters', async (c) => {
    const filters = await deps.db.select().from(pullFiltersTable).orderBy(desc(pullFiltersTable.updatedAt));
    return c.json({ filters });
  });

  app.post('/api/pulls/filters', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (typeof body?.name !== 'string' || body.name.trim() === '' ||
      typeof body?.description !== 'string' || typeof body?.query !== 'string') {
      return c.json({ error: 'name, description, and query are required' }, 400);
    }

    const now = new Date().toISOString();
    const filter = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      description: body.description.trim(),
      query: body.query.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await deps.db.insert(pullFiltersTable).values(filter);
    return c.json({ filter }, 201);
  });

  app.put('/api/pulls/filters/:id', async (c) => {
    const id = decodeURIComponent(c.req.param('id'));
    const body = await c.req.json().catch(() => null);
    if (typeof body?.name !== 'string' || body.name.trim() === '' ||
      typeof body?.description !== 'string' || typeof body?.query !== 'string') {
      return c.json({ error: 'name, description, and query are required' }, 400);
    }

    const existing = await deps.db.select().from(pullFiltersTable).where(eq(pullFiltersTable.id, id)).limit(1);
    if (existing.length === 0) return c.json({ error: 'Filter not found' }, 404);

    const updates = {
      name: body.name.trim(),
      description: body.description.trim(),
      query: body.query.trim(),
      updatedAt: new Date().toISOString(),
    };
    await deps.db.update(pullFiltersTable).set(updates).where(eq(pullFiltersTable.id, id));
    return c.json({ filter: { ...existing[0], ...updates } });
  });

  app.delete('/api/pulls/filters/:id', async (c) => {
    const id = decodeURIComponent(c.req.param('id'));
    const existing = await deps.db.select().from(pullFiltersTable).where(eq(pullFiltersTable.id, id)).limit(1);
    if (existing.length === 0) return c.json({ error: 'Filter not found' }, 404);
    await deps.db.delete(pullFiltersTable).where(eq(pullFiltersTable.id, id));
    return c.json({ success: true });
  });

  // Trigger review manually for a specific PR (supports optional ruleId or ruleIds)
  app.post('/api/pulls/:id/run', async (c) => {
    const id = decodeURIComponent(c.req.param('id'));
    let ruleIds: string[] | undefined;
    let engine: string | undefined;
    try {
      const body = await c.req.json();
      if (body.ruleIds && Array.isArray(body.ruleIds)) {
        ruleIds = body.ruleIds.map(String);
      } else if (body.ruleId && typeof body.ruleId === 'string') {
        ruleIds = [body.ruleId];
      }
      if (typeof body.engine === 'string' && body.engine.trim()) {
        engine = body.engine.trim();
      }
    } catch {
      // Body is optional
    }

    try {
      const jobIds = await deps.queue.enqueueRules(id, ruleIds, engine);
      return c.json({ success: true, jobIds, jobId: jobIds[0] ?? '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AIレビューの実行要求に失敗しました。';
      return c.json({ error: message }, 400);
    }
  });

  // Get all rule results for a PR
  app.get('/api/pulls/:id/rule-results', async (c) => {
    const id = decodeURIComponent(c.req.param('id'));
    const rows = await deps.db
      .select()
      .from(reviewRuleResultsTable)
      .where(eq(reviewRuleResultsTable.requestId, id))
      .orderBy(desc(reviewRuleResultsTable.createdAt));

    const results = rows.map((r) => {
      let findings = [];
      try {
        findings = JSON.parse(r.findings);
      } catch {
        // ignore
      }
      let metadata = undefined;
      if (r.metadata) {
        try {
          metadata = JSON.parse(r.metadata);
          if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
            metadata = Object.fromEntries(
              Object.entries(metadata).filter(([key]) => key !== 'reviewReport')
            );
          }
        } catch {
          // ignore
        }
      }
      return {
        ...r,
        findings,
        metadata,
      };
    });

    return c.json({ results });
  });

  // Serve generated review HTML report
  app.get('/api/reports/:id/html', async (c) => {
    const id = c.req.param('id');
    // Path traversal defense
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.text('Invalid report ID format', 400);
    }

    const html = await deps.storage.getReportHtml(id);
    if (html !== null) {
      c.header('X-Content-Type-Options', 'nosniff');
      c.header('X-Frame-Options', 'SAMEORIGIN');
      c.header(
        'Content-Security-Policy',
        "default-src 'self' 'unsafe-inline' https:; script-src 'unsafe-inline' 'self'; frame-ancestors 'self'"
      );
      return c.html(html);
    }

    // On-demand HTML generation from reportData
    const data = await deps.storage.getReportData(id);
    if (data === null) {
      return c.text('Report not found', 404);
    }

    const generatedHtml = generateStandaloneReviewHtml(data);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'SAMEORIGIN');
    return c.html(generatedHtml);
  });

  // Serve generated review JSON report data
  app.get('/api/reports/:id/data', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.json({ error: 'Invalid report ID format' }, 400);
    }

    const data = await deps.storage.getReportData(id);
    if (data !== null) {
      return c.json(data);
    }

    const reportRecords = await deps.db
      .select()
      .from(reviewReportsTable)
      .where(eq(reviewReportsTable.id, id));
    const report = reportRecords[0];
    if (!report) {
      return c.json({ error: 'Report data not found' }, 404);
    }

    return c.json({
      verdict: report.verdict ?? 'COMMENT',
      summary: {
        brief: report.summary ?? '',
        changedCode: [],
        reachPaths: [],
      },
      comments: [],
      createdAt: report.createdAt,
    });
  });

  // On-demand export HTML report
  app.get('/api/reports/:id/export.html', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.text('Invalid report ID format', 400);
    }

    let html = await deps.storage.getReportHtml(id);
    if (html === null) {
      const data = await deps.storage.getReportData(id);
      if (data === null) {
        return c.text('Report not found', 404);
      }
      html = generateStandaloneReviewHtml(data);
    }

    c.header('Content-Disposition', `attachment; filename="report-${id}.html"`);
    return c.html(html);
  });

  // Serve job execution log
  app.get('/api/jobs/:id/log', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.text('Invalid job ID format', 400);
    }

    const logPath = resolve(deps.logsDir ?? './data/logs', `${id}.log`);
    try {
      const content = await Deno.readTextFile(logPath);
      return c.text(content);
    } catch {
      return c.text('No log available for this job', 404);
    }
  });

  // Review Rules CRUD
  app.get('/api/rules', async (c) => {
    const rows = await deps.db.select().from(reviewRulesTable);
    const rules = rows.map((row) => {
      let trigger = {};
      try {
        trigger = JSON.parse(row.triggerJson);
      } catch {
        // Fallback to empty object
      }
      let concurrency = undefined;
      if (row.concurrencyJson) {
        try {
          concurrency = JSON.parse(row.concurrencyJson);
        } catch {
          // Fallback to undefined
        }
      }
      let engineOverride = undefined;
      if (row.engineOverrideJson) {
        try {
          engineOverride = JSON.parse(row.engineOverrideJson);
        } catch {
          // Fallback to undefined
        }
      }
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        engine: row.engine,
        engineProfileId: row.engine,
        instructions: row.instructions,
        engineOverride,
        trigger,
        concurrency,
        enabled: Boolean(row.enabled),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    return c.json({ rules });
  });

  app.post('/api/rules', async (c) => {
    try {
      const body = await c.req.json();
      if (!body.name || !body.instructions) {
        return c.json({ error: 'name and instructions are required' }, 400);
      }

      const now = new Date().toISOString();
      const id = body.id || `rule-${crypto.randomUUID().slice(0, 8)}`;
      const engineValue = body.engineProfileId ?? body.engine;
      const newRule = {
        id,
        name: String(body.name),
        description: body.description ? String(body.description) : '',
        category: body.category ? String(body.category) : 'general',
        engine: engineValue ? String(engineValue) : 'default',
        instructions: String(body.instructions),
        engineOverrideJson: body.engineOverride ? JSON.stringify(body.engineOverride) : null,
        triggerJson: JSON.stringify(body.trigger ?? { types: ['opened', 'synchronize'] }),
        concurrencyJson: body.concurrency ? JSON.stringify(body.concurrency) : null,
        enabled: body.enabled !== false,
        createdAt: now,
        updatedAt: now,
      };

      await deps.db.insert(reviewRulesTable).values(newRule);
      return c.json({
        success: true,
        rule: {
          ...newRule,
          engineProfileId: newRule.engine,
          engineOverride: body.engineOverride,
          trigger: body.trigger ?? { types: ['opened', 'synchronize'] },
          concurrency: body.concurrency,
          enabled: newRule.enabled,
        },
      }, 201);
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  app.get('/api/rules/:id', async (c) => {
    const id = c.req.param('id');
    const rows = await deps.db.select().from(reviewRulesTable).where(eq(reviewRulesTable.id, id));
    if (rows.length === 0) {
      return c.json({ error: 'Rule not found' }, 404);
    }
    const row = rows[0];
    let trigger = {};
    try {
      trigger = JSON.parse(row.triggerJson);
    } catch {
      // Fallback
    }
    let concurrency = undefined;
    if (row.concurrencyJson) {
      try {
        concurrency = JSON.parse(row.concurrencyJson);
      } catch {
        // Fallback
      }
    }
    let engineOverride = undefined;
    if (row.engineOverrideJson) {
      try {
        engineOverride = JSON.parse(row.engineOverrideJson);
      } catch {
        // Fallback
      }
    }
    return c.json({
      rule: {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        engine: row.engine,
        engineProfileId: row.engine,
        instructions: row.instructions,
        engineOverride,
        trigger,
        concurrency,
        enabled: Boolean(row.enabled),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  });

  app.put('/api/rules/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await deps.db.select().from(reviewRulesTable).where(eq(reviewRulesTable.id, id));
    if (existing.length === 0) {
      return c.json({ error: 'Rule not found' }, 404);
    }

    try {
      const body = await c.req.json();
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { updatedAt: now };

      if (body.name !== undefined) updates.name = String(body.name);
      if (body.description !== undefined) updates.description = String(body.description);
      if (body.category !== undefined) updates.category = String(body.category);
      const engineValue = body.engineProfileId ?? body.engine;
      if (engineValue !== undefined) updates.engine = String(engineValue);
      if (body.instructions !== undefined) updates.instructions = String(body.instructions);
      if (body.engineOverride !== undefined) {
        updates.engineOverrideJson = body.engineOverride ? JSON.stringify(body.engineOverride) : null;
      }
      if (body.trigger !== undefined) updates.triggerJson = JSON.stringify(body.trigger);
      if (body.concurrency !== undefined) updates.concurrencyJson = JSON.stringify(body.concurrency);
      if (body.enabled !== undefined) updates.enabled = body.enabled ? true : false;

      await deps.db.update(reviewRulesTable).set(updates).where(eq(reviewRulesTable.id, id));
      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  app.delete('/api/rules/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await deps.db.select().from(reviewRulesTable).where(eq(reviewRulesTable.id, id));
    if (existing.length === 0) {
      return c.json({ error: 'Rule not found' }, 404);
    }

    await deps.db.delete(reviewRulesTable).where(eq(reviewRulesTable.id, id));
    return c.json({ success: true });
  });

  // Triggers CRUD endpoints
  app.get('/api/triggers', async (c) => {
    const rows = await deps.db.select().from(reviewTriggersTable);
    const triggers = rows.map((row) => {
      let paths: string[] | undefined = undefined;
      let pathsIgnore: string[] | undefined = undefined;
      let ruleIds: string[] = [];
      try {
        if (row.pathsJson) paths = JSON.parse(row.pathsJson);
        if (row.pathsIgnoreJson) pathsIgnore = JSON.parse(row.pathsIgnoreJson);
        if (row.ruleIdsJson) ruleIds = JSON.parse(row.ruleIdsJson);
      } catch {
        // Fallback
      }
      return {
        id: row.id,
        name: row.name,
        repository: row.repository,
        paths,
        pathsIgnore,
        ruleIds,
        enabled: Boolean(row.enabled),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    return c.json({ triggers });
  });

  app.post('/api/triggers', async (c) => {
    try {
      const body = await c.req.json();
      if (!body.name || !body.repository) {
        return c.json({ error: 'Name and repository are required' }, 400);
      }
      const now = new Date().toISOString();
      const id = body.id || `trigger-${Date.now()}`;
      const newTrigger = {
        id,
        name: String(body.name),
        repository: String(body.repository),
        pathsJson: body.paths && Array.isArray(body.paths) ? JSON.stringify(body.paths) : null,
        pathsIgnoreJson: body.pathsIgnore && Array.isArray(body.pathsIgnore) ? JSON.stringify(body.pathsIgnore) : null,
        ruleIdsJson: JSON.stringify(Array.isArray(body.ruleIds) ? body.ruleIds : []),
        enabled: body.enabled !== false,
        createdAt: now,
        updatedAt: now,
      };
      await deps.db.insert(reviewTriggersTable).values(newTrigger);
      return c.json({ success: true, trigger: { ...newTrigger, paths: body.paths, pathsIgnore: body.pathsIgnore, ruleIds: body.ruleIds || [] } }, 201);
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  app.get('/api/triggers/:id', async (c) => {
    const id = c.req.param('id');
    const rows = await deps.db.select().from(reviewTriggersTable).where(eq(reviewTriggersTable.id, id));
    if (rows.length === 0) {
      return c.json({ error: 'Trigger not found' }, 404);
    }
    const row = rows[0];
    let paths: string[] | undefined = undefined;
    let pathsIgnore: string[] | undefined = undefined;
    let ruleIds: string[] = [];
    try {
      if (row.pathsJson) paths = JSON.parse(row.pathsJson);
      if (row.pathsIgnoreJson) pathsIgnore = JSON.parse(row.pathsIgnoreJson);
      if (row.ruleIdsJson) ruleIds = JSON.parse(row.ruleIdsJson);
    } catch {
      // Fallback
    }
    return c.json({
      trigger: {
        id: row.id,
        name: row.name,
        repository: row.repository,
        paths,
        pathsIgnore,
        ruleIds,
        enabled: Boolean(row.enabled),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  });

  app.put('/api/triggers/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await deps.db.select().from(reviewTriggersTable).where(eq(reviewTriggersTable.id, id));
    if (existing.length === 0) {
      return c.json({ error: 'Trigger not found' }, 404);
    }

    try {
      const body = await c.req.json();
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { updatedAt: now };

      if (body.name !== undefined) updates.name = String(body.name);
      if (body.repository !== undefined) updates.repository = String(body.repository);
      if (body.paths !== undefined) {
        updates.pathsJson = Array.isArray(body.paths) && body.paths.length > 0 ? JSON.stringify(body.paths) : null;
      }
      if (body.pathsIgnore !== undefined) {
        updates.pathsIgnoreJson = Array.isArray(body.pathsIgnore) && body.pathsIgnore.length > 0 ? JSON.stringify(body.pathsIgnore) : null;
      }
      if (body.ruleIds !== undefined) {
        updates.ruleIdsJson = JSON.stringify(Array.isArray(body.ruleIds) ? body.ruleIds : []);
      }
      if (body.enabled !== undefined) updates.enabled = body.enabled ? true : false;

      await deps.db.update(reviewTriggersTable).set(updates).where(eq(reviewTriggersTable.id, id));
      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  app.delete('/api/triggers/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await deps.db.select().from(reviewTriggersTable).where(eq(reviewTriggersTable.id, id));
    if (existing.length === 0) {
      return c.json({ error: 'Trigger not found' }, 404);
    }

    await deps.db.delete(reviewTriggersTable).where(eq(reviewTriggersTable.id, id));
    return c.json({ success: true });
  });

  // Settings endpoints
  app.get('/api/settings', async (c) => {
    const settings = await deps.settingsService.getAllSettings();
    return c.json(maskSecretEnvironmentValues(settings));
  });

  app.post('/api/settings', async (c) => {
    try {
      const body = await c.req.json();
      const current = await deps.settingsService.getAllSettings();
      const merged = restoreSecretEnvironmentValues(body, current);
      const updated = await deps.settingsService.updateSettings(merged);
      return c.json(maskSecretEnvironmentValues(updated));
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  // Engine connection and execution test endpoint
  app.post('/api/engines/:engine/test', async (c) => {
    const engine = c.req.param('engine');
    let body: {
      mode?: string;
      profileId?: string;
      binPath?: string;
      model?: string;
      effort?: string;
      sandboxMode?: string;
      ephemeral?: boolean;
      customEnv?: EngineEnvironment;
    } = {};
    try {
      body = await c.req.json();
    } catch {
      // Body is optional
    }

    const mode = body?.mode === 'execution' ? 'execution' : 'version';

    const settings = await deps.settingsService.getAllSettings();
    const matchedProfile = settings.engineProfiles?.find((p) => p.id === (body?.profileId ?? engine));

    let effectiveEngine = engine;
    let profileConfig: EngineOverrideConfig | null = null;
    if (matchedProfile) {
      effectiveEngine = matchedProfile.engineType;
      profileConfig = (matchedProfile.config ?? null) as EngineOverrideConfig | null;
    }

    if (effectiveEngine === 'mock') {
      if (mode === 'execution') {
        const delay = profileConfig?.delayMs ?? settings.engineSettings?.mock?.delayMs ?? 500;
        await new Promise((r) => setTimeout(r, Math.min(delay, 1500)));
        return c.json({
          success: true,
          mode: 'execution',
          version: 'mock-engine 1.0.0',
          message: 'Mockエンジンの実行検証（推論テスト）に成功しました。',
          output: 'OK (Mock engine simulation passed)',
        });
      }
      return c.json({
        success: true,
        mode: 'version',
        version: 'mock-engine 1.0.0',
        message: 'Mockエンジンは正常に利用可能です。',
      });
    }

    if (!['antigravity', 'claude-code', 'codex'].includes(effectiveEngine)) {
      return c.json({ error: `Unknown engine or profile: ${engine}` }, 400);
    }

    let binPath = '';
    let model = '';
    let effort = '';
    if (effectiveEngine === 'antigravity') {
      binPath = body?.binPath || profileConfig?.binPath || settings.engineSettings?.antigravity?.binPath || settings.agyBin || 'agy';
      model = body?.model || profileConfig?.model || settings.engineSettings?.antigravity?.model || '';
      effort = body?.effort || profileConfig?.effort || settings.engineSettings?.antigravity?.effort || '';
    } else if (effectiveEngine === 'claude-code') {
      binPath = body?.binPath || profileConfig?.binPath || settings.engineSettings?.claudeCode?.binPath || settings.claudeBin || 'claude';
      model = body?.model || profileConfig?.model || settings.engineSettings?.claudeCode?.model || '';
      effort = body?.effort || profileConfig?.effort || settings.engineSettings?.claudeCode?.effort || '';
    } else {
      binPath = body?.binPath || profileConfig?.binPath || settings.engineSettings?.codex?.binPath || 'codex';
      model = body?.model || profileConfig?.model || settings.engineSettings?.codex?.model || '';
      effort = body?.effort || profileConfig?.effort || settings.engineSettings?.codex?.effort || '';
    }

    const isExecution = mode === 'execution';
    const timeoutMs = isExecution ? 45000 : 5000;

    let args: string[] = isExecution
      ? ['-p', 'Respond with "kuramori test OK"', '--dangerously-skip-permissions']
      : ['--version'];

    if (effectiveEngine === 'codex' && isExecution) {
      const sandboxMode = body?.sandboxMode || profileConfig?.sandboxMode || settings.engineSettings.codex.sandboxMode || 'workspace-write';
      args = ['exec', '--json', '--sandbox', sandboxMode, '--config', 'approval_policy="never"'];
      if (body?.ephemeral ?? profileConfig?.ephemeral ?? settings.engineSettings.codex.ephemeral) args.push('--ephemeral');
      if (model) args.push('--model', model);
      if (effort) args.push('--config', `model_reasoning_effort=${JSON.stringify(effort)}`);
      args.push('-');
    }

    if (isExecution && effectiveEngine !== 'codex') {
      if (model) {
        args.push('--model', model);
      }
      if (effort) {
        args.push('--effort', effort);
      }
    }

    const engineKey = effectiveEngine === 'claude-code' ? 'claudeCode' : effectiveEngine;
    const globalEnvironment = (settings.engineSettings as unknown as Record<string, { customEnv?: EngineEnvironment }> | undefined)?.[engineKey]?.customEnv;
    const env = resolveEngineEnvironment(Deno.env.toObject(), globalEnvironment, profileConfig?.customEnv, body?.customEnv);
    try {
      const cmd = new Deno.Command(binPath, {
        args,
        stdin: effectiveEngine === 'codex' && isExecution ? 'piped' : 'null',
        stdout: 'piped',
        stderr: 'piped',
        env,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const child = cmd.spawn();
      if (effectiveEngine === 'codex' && isExecution) {
        const writer = child.stdin.getWriter();
        await writer.write(new TextEncoder().encode('Respond with "kuramori test OK"'));
        await writer.close();
      }
      const output = await child.output();
      const stdout = new TextDecoder().decode(output.stdout).trim();
      const stderr = new TextDecoder().decode(output.stderr).trim();

      if (output.success) {
        return c.json({
          success: true,
          mode,
          version: !isExecution ? (stdout || 'Version output empty') : undefined,
          output: isExecution ? (stdout || 'OK') : undefined,
          message: isExecution
            ? `${engine} の実行検証（推論テスト）に成功しました。`
            : `${engine} CLI の接続テストに成功しました。`,
        });
      } else {
        return c.json({
          success: false,
          mode,
          error: stderr || stdout || `CLI command exited with status ${output.code}`,
        });
      }
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : null;
      if (errorObj?.name === 'TimeoutError') {
        return c.json({
          success: false,
          mode,
          error: `${isExecution ? '推論実行テスト' : '接続テスト'}がタイムアウトしました (${timeoutMs / 1000}秒超過): ${binPath}`,
        });
      }
      if (err instanceof Deno.errors.NotFound) {
        return c.json({
          success: false,
          mode,
          error: `指定されたバイナリが見つかりません: ${binPath}`,
        });
      }
      return c.json({
        success: false,
        mode,
        error: `実行エラー: ${errorObj?.message || String(err)}`,
      });
    }
  });

  // Compile D2 diagram source with specified layout engine
  app.post('/api/diagram/compile', async (c) => {
    try {
      const body = await c.req.json();
      const d2Source = typeof body.d2Source === 'string' ? body.d2Source : '';
      if (!d2Source.trim()) {
        return c.json({ error: 'd2Source is required' }, 400);
      }

      const layout = ['tala', 'elk', 'dagre'].includes(body.layout) ? body.layout : 'tala';
      const svg = await compileD2ToSvg(d2Source, { layout });
      return c.json({ svg, layout });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Compilation failed: ${message}` }, 500);
    }
  });

  return app;
}
