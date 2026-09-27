import { assertEquals, assertStringIncludes } from '@std/assert';
import { Hono } from 'hono';
import { createDb, initDatabase } from './db/index.ts';
import { LocalFileReportStorage, GitHubProvider } from '@kuramori/core';
import { ReviewQueue } from './queue.ts';
import { GitHubPoller } from './poller.ts';
import { createApi } from './api.ts';
import { SettingsService } from './settings.ts';
import { fromFileUrl, join } from '@std/path';

Deno.test('Server E2E - start HTTP server and verify endpoints via fetch', async () => {
  const port = 3555;
  const tempDir = await Deno.makeTempDir({ prefix: 'kuramori-e2e-test-' });
  const dbUrl = `file:${tempDir}/e2e.db`;
  const reportsDir = `${tempDir}/reports`;
  const logsDir = `${tempDir}/logs`;

  const { db, client } = createDb(dbUrl);
  await initDatabase(client);

  const storage = new LocalFileReportStorage(reportsDir);
  const vcsProvider = new GitHubProvider();
  const settingsService = new SettingsService(db, false);
  const queue = new ReviewQueue(db, storage, { reportsDir, vcsProvider, settingsService });
  const poller = new GitHubPoller(vcsProvider, db, queue, settingsService);

  const api = createApi({ db, storage, poller, queue, settingsService, logsDir });
  const app = new Hono();
  app.route('/', api);

  const MIME_TYPES: Record<string, string> = {
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    ico: 'image/x-icon',
    html: 'text/html; charset=utf-8',
  };

  // Serve static UI if built
  const webDistPath = fromFileUrl(new URL('../../web/dist', import.meta.url));
  try {
    const distStat = await Deno.stat(webDistPath);
    if (distStat.isDirectory) {
      app.get('*', async (c) => {
        if (c.req.path.startsWith('/api/')) {
          return c.text('API not found', 404);
        }
        const normalizedPath = join(webDistPath, c.req.path.slice(1));
        try {
          const stat = await Deno.stat(normalizedPath);
          if (stat.isFile) {
            const content = await Deno.readFile(normalizedPath);
            const ext = normalizedPath.split('.').pop()?.toLowerCase() ?? '';
            return c.body(content, 200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
          }
        } catch {
          // File not found in static dist; fallback to index.html SPA routing
        }
        try {
          const html = await Deno.readTextFile(join(webDistPath, 'index.html'));
          return c.html(html);
        } catch {
          return c.text('UI not found', 404);
        }
      });
    }
  } catch {
    // dist not available
  }

  // Start HTTP server
  const server = Deno.serve({ port, onListen: () => {} }, app.fetch);

  try {
    const baseUrl = `http://localhost:${port}`;

    // 1. Test OpenAPI JSON
    const openapiRes = await fetch(`${baseUrl}/api/openapi.json`);
    assertEquals(openapiRes.status, 200);
    const openapiJson = await openapiRes.json();
    assertEquals(openapiJson.info.title, 'kuramori API');

    // 2. Test Scalar API Reference Doc UI
    const docRes = await fetch(`${baseUrl}/api/doc`);
    assertEquals(docRes.status, 200);
    const docHtml = await docRes.text();
    assertStringIncludes(docHtml, 'Scalar');

    // 3. Test Pull Requests List
    const pullsRes = await fetch(`${baseUrl}/api/pulls`);
    assertEquals(pullsRes.status, 200);
    const pullsData = await pullsRes.json();
    assertEquals(Array.isArray(pullsData.items), true);

    // 4. Test Review Rules Create & Fetch Lifecycle
    const createRuleRes = await fetch(`${baseUrl}/api/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'rule-e2e-security',
        name: 'E2E Security Rule',
        description: 'Verifies auth and secrets',
        category: 'security',
        instructions: '=== 1. SCOPE ===\nSecurity checks\n=== 2. SMELLS ===\nIDOR\n=== 3. PROTOCOL ===\nSearch callers\n=== 4. NOISE ===\nIgnore style',
        trigger: { paths: ['apps/server/**'] },
        enabled: true,
      }),
    });
    assertEquals(createRuleRes.status, 201);

    const getRuleRes = await fetch(`${baseUrl}/api/rules/rule-e2e-security`);
    assertEquals(getRuleRes.status, 200);
    const ruleDetail = await getRuleRes.json();
    assertEquals(ruleDetail.rule.id, 'rule-e2e-security');
    assertEquals(ruleDetail.rule.name, 'E2E Security Rule');

    const rulesRes = await fetch(`${baseUrl}/api/rules`);
    assertEquals(rulesRes.status, 200);
    const rulesData = await rulesRes.json();
    assertEquals(Array.isArray(rulesData.rules), true);
    assertEquals(rulesData.rules.some((r: { id?: string }) => r.id === 'rule-e2e-security'), true);

    // 5. Test Triggers List
    const triggersRes = await fetch(`${baseUrl}/api/triggers`);
    assertEquals(triggersRes.status, 200);
    const triggersData = await triggersRes.json();
    assertEquals(Array.isArray(triggersData.triggers), true);

    // 6. Test Mock Engine verification
    const engineRes = await fetch(`${baseUrl}/api/engines/mock/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assertEquals(engineRes.status, 200);
    const engineData = await engineRes.json();
    assertEquals(engineData.success, true);
    assertEquals(engineData.version, 'mock-engine 1.0.0');

    // 7. Test Web UI HTML fallback
    const rootRes = await fetch(`${baseUrl}/`);
    assertEquals(rootRes.status, 200);
    const rootHtml = await rootRes.text();
    assertStringIncludes(rootHtml, 'kuramori');

    // 8. Test Favicon & Brand Icons
    const faviconRes = await fetch(`${baseUrl}/favicon.svg`);
    assertEquals(faviconRes.status, 200);
    assertEquals(faviconRes.headers.get('Content-Type'), 'image/svg+xml');
    const faviconSvg = await faviconRes.text();
    assertStringIncludes(faviconSvg, '<svg');

    const icoRes = await fetch(`${baseUrl}/favicon.ico`);
    assertEquals(icoRes.status, 200);
    assertEquals(icoRes.headers.get('Content-Type'), 'image/x-icon');
  } finally {
    // Graceful shutdown
    await server.shutdown();
    client.close();
    await Deno.remove(tempDir, { recursive: true });
  }
});
