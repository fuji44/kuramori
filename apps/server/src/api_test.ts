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

    // 4b. Test report JSON data serving
    const testData = {
      verdict: 'APPROVE' as const,
      summary: { brief: 'APIテスト要約', changedCode: 'コード', reachPaths: [] },
      comments: [],
    };
    await storage.saveReportData('test-report-json', testData);

    const resReportJson = await api.request('/api/reports/test-report-json/data');
    assertEquals(resReportJson.status, 200);
    const retrievedJson = await resReportJson.json();
    assertEquals(retrievedJson.verdict, 'APPROVE');
    assertEquals(retrievedJson.summary.brief, 'APIテスト要約');

    // 5. Test 404 for non-existent report
    const res404 = await api.request('/api/reports/non-existent/html');
    assertEquals(res404.status, 404);
    const res404Json = await api.request('/api/reports/non-existent/data');
    assertEquals(res404Json.status, 404);

    // 6. Test Settings API
    const resSettingsGet = await api.request('/api/settings');
    assertEquals(resSettingsGet.status, 200);
    const dataSettings1 = await resSettingsGet.json();
    assertEquals(dataSettings1.autoQueue, false);
    assertEquals(dataSettings1.autoQueueIncludeOwn, false);
    assertEquals(dataSettings1.reviewEngine, 'antigravity');

    const resSettingsPost = await api.request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoQueue: true, autoQueueIncludeOwn: true, reviewEngine: 'mock' }),
    });
    assertEquals(resSettingsPost.status, 200);
    const dataSettings2 = await resSettingsPost.json();
    assertEquals(dataSettings2.autoQueue, true);
    assertEquals(dataSettings2.autoQueueIncludeOwn, true);
    assertEquals(dataSettings2.reviewEngine, 'mock');

    const resSettingsGet2 = await api.request('/api/settings');
    const dataSettings3 = await resSettingsGet2.json();
    assertEquals(dataSettings3.autoQueue, true);
    assertEquals(dataSettings3.autoQueueIncludeOwn, true);
    assertEquals(dataSettings3.reviewEngine, 'mock');

    // 7. Test poller with isOwn filtering:
    // With autoQueue: true and autoQueueIncludeOwn: false, own PR should NOT be queued,
    // while review requested PR SHOULD be queued.
    await settingsService.updateSettings({ autoQueue: true, autoQueueIncludeOwn: false });

    const ownPr: ReviewRequest = {
      id: 'github:test/repo#2',
      userId: 'default',
      provider: 'github',
      repository: 'test/repo',
      number: 2,
      title: 'feat: my own pull request',
      author: 'me',
      url: 'https://github.com/test/repo/pull/2',
      sourceBranch: 'feat/own',
      targetBranch: 'main',
      headSha: 'def5678',
      isDraft: false,
      isOwn: true,
      state: 'open',
      createdAt: '2026-09-18T02:00:00Z',
      updatedAt: '2026-09-18T02:00:00Z',
    };

    const reviewRequestedPr: ReviewRequest = {
      id: 'github:test/repo#3',
      userId: 'default',
      provider: 'github',
      repository: 'test/repo',
      number: 3,
      title: 'feat: someone else review request',
      author: 'someone',
      url: 'https://github.com/test/repo/pull/3',
      sourceBranch: 'feat/other',
      targetBranch: 'main',
      headSha: '7890abc',
      isDraft: false,
      isOwn: false,
      state: 'open',
      createdAt: '2026-09-18T03:00:00Z',
      updatedAt: '2026-09-18T03:00:00Z',
    };

    let queuedIds: string[] = [];
    const testQueue = {
      enqueue: (requestId: string) => {
        queuedIds.push(requestId);
        return Promise.resolve(`job-${requestId}`);
      },
    } as unknown as ReviewQueue;

    const testVcs: VCSProvider = {
      name: 'mock',
      listReviewRequests: () => Promise.resolve([ownPr, reviewRequestedPr]),
      getReviewRequest: (r, n) => Promise.resolve(n === 2 ? ownPr : reviewRequestedPr),
      getDiff: () => Promise.resolve('diff'),
      getCloneUrl: () => Promise.resolve(''),
    };

    const testPoller = new GitHubPoller(testVcs, db, testQueue, settingsService);
    await testPoller.poll();

    // Only reviewRequestedPr (#3) should be auto-queued, ownPr (#2) should not
    assertEquals(queuedIds.includes('github:test/repo#3'), true);
    assertEquals(queuedIds.includes('github:test/repo#2'), false);

    // Now enable autoQueueIncludeOwn: true and poll with a new own PR (#4)
    await settingsService.updateSettings({ autoQueueIncludeOwn: true });
    queuedIds = [];

    const ownPr4: ReviewRequest = {
      id: 'github:test/repo#4',
      userId: 'default',
      provider: 'github',
      repository: 'test/repo',
      number: 4,
      title: 'feat: another own pull request',
      author: 'me',
      url: 'https://github.com/test/repo/pull/4',
      sourceBranch: 'feat/own-4',
      targetBranch: 'main',
      headSha: '4444abc',
      isDraft: false,
      isOwn: true,
      state: 'open',
      createdAt: '2026-09-18T04:00:00Z',
      updatedAt: '2026-09-18T04:00:00Z',
    };

    const testVcs2: VCSProvider = {
      name: 'mock',
      listReviewRequests: () => Promise.resolve([ownPr4]),
      getReviewRequest: () => Promise.resolve(ownPr4),
      getDiff: () => Promise.resolve('diff'),
      getCloneUrl: () => Promise.resolve(''),
    };

    const testPoller2 = new GitHubPoller(testVcs2, db, testQueue, settingsService);
    await testPoller2.poll();

    // Now ownPr4 should be auto-queued because autoQueueIncludeOwn is true
    assertEquals(queuedIds.includes('github:test/repo#4'), true);

    // 9. Test diagram compilation endpoint
    const resCompile = await api.request('/api/diagram/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ d2Source: 'a -> b', layout: 'dagre' }),
    });
    assertEquals(resCompile.status, 200);
    const compileJson = await resCompile.json();
    assertEquals(typeof compileJson.svg, 'string');
    assertEquals(compileJson.svg.includes('<svg'), true);
    assertEquals(compileJson.layout, 'dagre');

    client.close();
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
