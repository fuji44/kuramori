import { Hono } from 'hono';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, initDatabase } from './db/index.ts';
import { LocalFileReportStorage, GitHubProvider } from '@review-base/core';
import { ReviewQueue } from './queue.ts';
import { GitHubPoller } from './poller.ts';
import { createApi } from './api.ts';
import { ClaudeCodeEngine, MockReviewEngine } from '@review-base/runner';
import { SettingsService } from './settings.ts';

async function bootstrap() {
  const port = parseInt(Deno.env.get('PORT') ?? '3456', 10);
  const dbUrl = Deno.env.get('DATABASE_URL') ?? 'file:data/review-base.db';
  const reportsDir = resolve(Deno.env.get('REPORTS_DIR') ?? './data/reports');
  const logsDir = join(dirname(reportsDir), 'logs');

  const { db, client } = createDb(dbUrl);
  await initDatabase(client);

  const storage = new LocalFileReportStorage(reportsDir);
  const vcsProvider = new GitHubProvider();
  const settingsService = new SettingsService(db);

  const queue = new ReviewQueue(db, storage, { reportsDir, vcsProvider, settingsService });
  const poller = new GitHubPoller(vcsProvider, db, queue, settingsService);

  // Start polling in background
  poller.start();

  const api = createApi({ db, storage, poller, queue, settingsService, logsDir });
  const app = new Hono();

  // Mount API
  app.route('/', api);

  const webDistPath = fileURLToPath(new URL('../../web/dist', import.meta.url));

  // Serve static UI assets if built
  try {
    const distStat = await Deno.stat(webDistPath);
    if (distStat.isDirectory) {
      // Serve static files in dist/assets
      app.get('/assets/*', async (c) => {
        const filePath = `${webDistPath}${c.req.path}`;
        try {
          const content = await Deno.readFile(filePath);
          const ext = filePath.split('.').pop() ?? '';
          const contentType = ext === 'css' ? 'text/css' : ext === 'js' ? 'application/javascript' : 'application/octet-stream';
          return c.body(content, 200, { 'Content-Type': contentType });
        } catch {
          return c.text('Not found', 404);
        }
      });

      // Fallback for SPA routing
      app.get('*', async (c) => {
        if (c.req.path.startsWith('/api/')) {
          return c.text('API not found', 404);
        }
        try {
          const html = await Deno.readTextFile(`${webDistPath}/index.html`);
          return c.html(html);
        } catch {
          return c.text('UI not found', 404);
        }
      });
    }
  } catch {
    // web/dist not built yet; API mode
  }

  console.log(`Server started at http://localhost:${port}`);

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    poller.stop();
    client.close();
    Deno.exit(0);
  };

  Deno.addSignalListener('SIGINT', shutdown);
  Deno.addSignalListener('SIGTERM', shutdown);

  Deno.serve({ port }, app.fetch);
}

if (import.meta.main) {
  await bootstrap();
}
