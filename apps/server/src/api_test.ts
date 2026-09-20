import { assertEquals } from 'jsr:@std/assert@^1.0.11';
import { createDb, initDatabase } from './db/index.ts';
import { reviewRequestsTable, reviewReportsTable, reviewJobsTable } from './db/schema.ts';
import { createApi } from './api.ts';
import { LocalFileReportStorage } from '@review-base/core';
import type { VCSProvider, ReviewRequest } from '@review-base/core';
import { ReviewQueue } from './queue.ts';
import { GitHubPoller } from './poller.ts';
import { SettingsService } from './settings.ts';

Deno.test('API Endpoints - comprehensive integration test', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'review-base-api-test-' });
  const dbUrl = `file:${tempDir}/test.db`;
  const reportsDir = `${tempDir}/reports`;

  try {
    const { db, client } = createDb(dbUrl);
    await initDatabase(client);
    const storage = new LocalFileReportStorage(reportsDir);
    const settingsService = new SettingsService(db, false); // default false

    // Mock VCSProvider
    const mockPr: ReviewRequest = {
      id: 'github:test/repo#1',
      userId: 'default',
      provider: 'github',
      repository: 'test/repo',
      number: 1,
      title: 'feat: test pull request',
      author: 'octocat',
      url: 'https://github.com/test/repo/pull/1',
      sourceBranch: 'feat/test',
      targetBranch: 'main',
      headSha: 'abc1234',
      isDraft: false,
      state: 'open',
      createdAt: '2026-09-18T00:00:00Z',
      updatedAt: '2026-09-18T01:00:00Z',
    };

    const mockVcs: VCSProvider = {
      name: 'mock',
      listReviewRequests: () => Promise.resolve([mockPr]),
      getReviewRequest: () => Promise.resolve(mockPr),
      getDiff: () => Promise.resolve('diff --git a/file b/file'),
      getCloneUrl: () => Promise.resolve('https://github.com/test/repo.git'),
    };

    const queue = new ReviewQueue(db, storage, { reportsDir });
    const poller = new GitHubPoller(mockVcs, db, queue, settingsService);
    const api = createApi({ db, storage, poller, queue, settingsService });

    // 1. Initial GET /api/reviews -> empty
    const res1 = await api.request('/api/reviews');
    assertEquals(res1.status, 200);
    const data1 = await res1.json();
    assertEquals(data1.items.length, 0);

    // 2. Trigger POST /api/reviews/refresh -> should poll and insert mockPr
    const resRefresh = await api.request('/api/reviews/refresh', { method: 'POST' });
    assertEquals(resRefresh.status, 200);

    // 3. GET /api/reviews -> should contain 1 item
    const res2 = await api.request('/api/reviews');
    assertEquals(res2.status, 200);
    const data2 = await res2.json();
    assertEquals(data2.items.length, 1);
    assertEquals(data2.items[0].id, 'github:test/repo#1');
    assertEquals(data2.items[0].title, 'feat: test pull request');

    // 4. Test report HTML serving
    const testHtml = '<html><body><h1>Approved</h1></body></html>';
    await storage.saveReport('test-report-1', testHtml);

    const resReport = await api.request('/api/reports/test-report-1/html');
    assertEquals(resReport.status, 200);
    const htmlBody = await resReport.text();
    assertEquals(htmlBody, testHtml);

    // 5. Test 404 for non-existent report
    const res404 = await api.request('/api/reports/non-existent/html');
    assertEquals(res404.status, 404);

    // 6. Test Settings API
    const resSettingsGet = await api.request('/api/settings');
    assertEquals(resSettingsGet.status, 200);
    const dataSettings1 = await resSettingsGet.json();
    assertEquals(dataSettings1.autoQueue, false);
    assertEquals(dataSettings1.reviewEngine, 'antigravity');

    const resSettingsPost = await api.request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoQueue: true, reviewEngine: 'mock' }),
    });
    assertEquals(resSettingsPost.status, 200);
    const dataSettings2 = await resSettingsPost.json();
    assertEquals(dataSettings2.autoQueue, true);
    assertEquals(dataSettings2.reviewEngine, 'mock');

    const resSettingsGet2 = await api.request('/api/settings');
    const dataSettings3 = await resSettingsGet2.json();
    assertEquals(dataSettings3.autoQueue, true);
    assertEquals(dataSettings3.reviewEngine, 'mock');

    client.close();
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
