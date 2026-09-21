import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from './db/index.ts';
import { reviewJobsTable, reviewReportsTable, reviewRequestsTable } from './db/schema.ts';
import type { ReportStorage } from '@review-base/core';
import type { GitHubPoller } from './poller.ts';
import type { ReviewQueue } from './queue.ts';
import type { SettingsService } from './settings.ts';
import { compileD2ToSvg } from '@review-base/runner';

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

  // Trigger review manually for a specific PR
  app.post('/api/reviews/:id/run', async (c) => {
    const id = decodeURIComponent(c.req.param('id'));
    const jobId = await deps.queue.enqueue(id);
    return c.json({ success: true, jobId });
  });

  // Serve generated review HTML report
  app.get('/api/reports/:id/html', async (c) => {
    const id = c.req.param('id');
    // Path traversal defense
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.text('Invalid report ID format', 400);
    }

    const html = await deps.storage.getReportHtml(id);
    if (html === null) {
      return c.text('Report not found', 404);
    }

    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'SAMEORIGIN');
    c.header(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' https:; script-src 'unsafe-inline' 'self'; frame-ancestors 'self'"
    );
    return c.html(html);
  });

  // Serve generated review JSON report data
  app.get('/api/reports/:id/data', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.json({ error: 'Invalid report ID format' }, 400);
    }

    const data = await deps.storage.getReportData(id);
    if (data === null) {
      return c.json({ error: 'Report data not found' }, 404);
    }

    return c.json(data);
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
