import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from './db/index.ts';
import { reviewJobsTable, reviewReportsTable, reviewRequestsTable } from './db/schema.ts';
import type { ReportStorage } from '@review-base/core';
import type { GitHubPoller } from './poller.ts';
import type { ReviewQueue } from './queue.ts';
import type { SettingsService } from './settings.ts';

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
    const requests = await deps.db
      .select()
      .from(reviewRequestsTable)
      .where(eq(reviewRequestsTable.state, 'open'))
      .orderBy(desc(reviewRequestsTable.updatedAt));

    const jobs = await deps.db.select().from(reviewJobsTable);
    const reports = await deps.db.select().from(reviewReportsTable);

    const items = requests.map((req) => {
      const prJobs = jobs.filter((j) => j.requestId === req.id);
      // Latest job by startedAt or created
      const latestJob = prJobs.sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))[0];
      const report = latestJob?.reportId
        ? reports.find((r) => r.id === latestJob.reportId)
        : undefined;

      return {
        ...req,
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

  return app;
}
