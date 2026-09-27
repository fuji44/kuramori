import { Hono } from 'hono';
import { dirname, fromFileUrl, join, resolve } from '@std/path';
import { createDb, initDatabase } from './db/index.ts';
import { LocalFileReportStorage, GitHubProvider } from '@kuramori/core';
import { ReviewQueue } from './queue.ts';
import { GitHubPoller } from './poller.ts';
import { createApi } from './api.ts';
import { SettingsService } from './settings.ts';

export interface ServerOptions {
  port?: number;
  hostname?: string;
  dbUrl?: string;
  reportsDir?: string;
}

export async function bootstrap(options: ServerOptions = {}) {
  const port = options.port ?? parseInt(Deno.env.get('PORT') ?? '3456', 10);
  const hostname = options.hostname ?? Deno.env.get('HOST') ?? '127.0.0.1';
  const dbUrl = options.dbUrl ?? Deno.env.get('DATABASE_URL') ?? 'file:data/kuramori.db';
  const reportsDir = resolve(options.reportsDir ?? Deno.env.get('REPORTS_DIR') ?? './data/reports');
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

  const api = createApi({ db, storage, poller, queue, settingsService, logsDir, vcsProvider });
  const app = new Hono();

  // Mount API
  app.route('/', api);

  const webDistPath = fromFileUrl(new URL('../../web/dist', import.meta.url));

  const MIME_TYPES: Record<string, string> = {
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    ico: 'image/x-icon',
    json: 'application/json',
    html: 'text/html; charset=utf-8',
    woff2: 'font/woff2',
    woff: 'font/woff',
    ttf: 'font/ttf',
  };

  // Serve static UI assets if built
  try {
    const distStat = await Deno.stat(webDistPath);
    if (distStat.isDirectory) {
      app.get('*', async (c) => {
        if (c.req.path.startsWith('/api/')) {
          return c.text('API not found', 404);
        }

        // Prevent path traversal
        const normalizedPath = resolve(join(webDistPath, c.req.path.slice(1)));
        if (!normalizedPath.startsWith(webDistPath)) {
          return c.text('Forbidden', 403);
        }

        // 1. Try serving requested static file (assets, favicon, icons, etc.)
        try {
          const stat = await Deno.stat(normalizedPath);
          if (stat.isFile) {
            const content = await Deno.readFile(normalizedPath);
            const ext = normalizedPath.split('.').pop()?.toLowerCase() ?? '';
            const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
            return c.body(content, 200, { 'Content-Type': contentType });
          }
        } catch {
          // File does not exist, fall through to SPA fallback
        }

        // 2. Fallback to index.html for SPA routing
        try {
          const html = await Deno.readTextFile(join(webDistPath, 'index.html'));
          return c.html(html);
        } catch {
          return c.text('UI not found', 404);
        }
      });
    }
  } catch {
    // web/dist not built yet; API mode
  }

  const hostDisplay = hostname === '0.0.0.0' ? 'localhost' : hostname;
  console.log(`Server started at http://${hostDisplay}:${port}`);

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    poller.stop();
    client.close();
    Deno.exit(0);
  };

  Deno.addSignalListener('SIGINT', shutdown);
  Deno.addSignalListener('SIGTERM', shutdown);

  Deno.serve({ port, hostname }, app.fetch);
}

if (import.meta.main) {
  await bootstrap();
}
