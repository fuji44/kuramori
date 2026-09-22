import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from './db/index.ts';
import { reviewJobsTable, reviewReportsTable, reviewRequestsTable, reviewRulesTable, reviewRuleResultsTable } from './db/schema.ts';

import type { ReportStorage } from '@review-base/core';
import type { GitHubPoller } from './poller.ts';
import type { ReviewQueue } from './queue.ts';
import type { SettingsService } from './settings.ts';
import { compileD2ToSvg, generateStandaloneReviewHtml } from '@review-base/runner';


export interface ApiDependencies {
  db: AppDatabase;
  storage: ReportStorage;
  poller: GitHubPoller;
  queue: ReviewQueue;
  settingsService: SettingsService;
}

export function createApi(deps: ApiDependencies) {
  const app = new Hono();

  app.use('*', cors());

  // List all review requests with their latest review status and report info
  app.get('/api/reviews', async (c) => {
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
      const report = latestJob?.reportId
        ? reports.find((r) => r.id === latestJob.reportId)
        : undefined;

      let parsedLabels: Array<{ name: string; color?: string; description?: string }> = [];
      if (req.labels) {
        try {
          parsedLabels = JSON.parse(req.labels);
        } catch {}
      }

      let parsedAssignees: Array<{ login: string; avatarUrl?: string }> = [];
      if (req.assignees) {
        try {
          parsedAssignees = JSON.parse(req.assignees);
        } catch {}
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
  app.post('/api/reviews/refresh', async (c) => {
    await deps.poller.poll();
    return c.json({ success: true, message: 'Polled successfully' });
  });

  // Trigger review manually for a specific PR (supports optional ruleId or ruleIds)
  app.post('/api/reviews/:id/run', async (c) => {
    const id = decodeURIComponent(c.req.param('id'));
    let ruleIds: string[] | undefined;
    try {
      const body = await c.req.json();
      if (body.ruleIds && Array.isArray(body.ruleIds)) {
        ruleIds = body.ruleIds.map(String);
      } else if (body.ruleId && typeof body.ruleId === 'string') {
        ruleIds = [body.ruleId];
      }
    } catch {
      // Body is optional
    }

    const jobIds = await deps.queue.enqueueRules(id, ruleIds);
    return c.json({ success: true, jobIds, jobId: jobIds[0] ?? '' });
  });

  // Get all rule results for a PR
  app.get('/api/reviews/:id/rule-results', async (c) => {
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

    const logPath = `./data/logs/${id}.log`;
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
      const newRule = {
        id,
        name: String(body.name),
        description: body.description ? String(body.description) : '',
        category: body.category ? String(body.category) : 'general',
        engine: body.engine ? String(body.engine) : 'default',
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
      if (body.engine !== undefined) updates.engine = String(body.engine);
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

  // Settings endpoints
  app.get('/api/settings', async (c) => {
    const settings = await deps.settingsService.getAllSettings();
    return c.json(settings);
  });

  app.post('/api/settings', async (c) => {
    try {
      const body = await c.req.json();
      const updated = await deps.settingsService.updateSettings(body);
      return c.json(updated);
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
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
    } catch (err: any) {
      return c.json({ error: `Compilation failed: ${err.message || err}` }, 500);
    }
  });

  return app;
}
