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

    // Test OpenAPI and Scalar API Reference endpoints
    const resOpenApi = await api.request('/api/openapi.json');
    assertEquals(resOpenApi.status, 200);
    const openapiJson = await resOpenApi.json();
    assertEquals(openapiJson.openapi, '3.1.0');
    assertEquals(Boolean(openapiJson.paths['/api/rules']), true);
    assertEquals(Boolean(openapiJson.paths['/api/triggers']), true);

    const resDoc = await api.request('/api/doc');
    assertEquals(resDoc.status, 200);
    const docHtml = await resDoc.text();
    assertEquals(docHtml.toLowerCase().includes('scalar'), true);

    // Test redirect from legacy /openapi.json
    const resLegacyRedirect = await api.request('/openapi.json');
    assertEquals(resLegacyRedirect.status, 302);

    const emptyFiltersResponse = await api.request('/api/pulls/filters');
    assertEquals(emptyFiltersResponse.status, 200);
    assertEquals((await emptyFiltersResponse.json()).filters.length, 0);

    const createFilterResponse = await api.request('/api/pulls/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Open PRs', description: 'PRs awaiting review', query: 'is:open' }),
    });
    assertEquals(createFilterResponse.status, 201);
    const createdFilter = (await createFilterResponse.json()).filter;
    assertEquals(createdFilter.name, 'Open PRs');
    assertEquals(createdFilter.query, 'is:open');

    const updateFilterResponse = await api.request(`/api/pulls/filters/${createdFilter.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My open PRs', description: 'Assigned for review', query: 'is:open author:me' }),
    });
    assertEquals(updateFilterResponse.status, 200);
    assertEquals((await updateFilterResponse.json()).filter.query, 'is:open author:me');

    const deleteFilterResponse = await api.request(`/api/pulls/filters/${createdFilter.id}`, { method: 'DELETE' });
    assertEquals(deleteFilterResponse.status, 200);
    assertEquals((await (await api.request('/api/pulls/filters')).json()).filters.length, 0);

    // 1. Initial GET /api/pulls -> empty
    const res1 = await api.request('/api/pulls');
    assertEquals(res1.status, 200);
    const data1 = await res1.json();
    assertEquals(data1.items.length, 0);

    // 2. Trigger POST /api/pulls/refresh -> should poll and insert mockPr
    const resRefresh = await api.request('/api/pulls/refresh', { method: 'POST' });
    assertEquals(resRefresh.status, 200);

    // 3. GET /api/pulls -> should contain 1 item
    const res2 = await api.request('/api/pulls');
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

    // 7. Test poller auto-queuing:
    // With autoQueue: true, both own PR and review requested PR are queued.
    await settingsService.updateSettings({ autoQueue: true });

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

    assertEquals(queuedIds.includes('github:test/repo#3'), true);
    assertEquals(queuedIds.includes('github:test/repo#2'), true);

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
    // 10. Test Review Rules API and Initial Seed Presets
    const resRules = await api.request('/api/rules');
    assertEquals(resRules.status, 200);
    const rulesData = await resRules.json();
    assertEquals(rulesData.rules.length >= 3, true);
    const presetCorrectness = rulesData.rules.find((r: any) => r.id === 'preset-correctness');
    assertEquals(Boolean(presetCorrectness), true);
    assertEquals(presetCorrectness.engine, 'default');
    assertEquals(presetCorrectness.category, 'correctness');

    // Create a new rule
    const resCreateRule = await api.request('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'custom-rule',
        name: 'Custom Test Rule',
        description: 'Test custom rule',
        category: 'performance',
        instructions: 'Check for performance regressions',
        engineOverride: {
          model: 'gemini-3.8-flash',
          systemPrompt: 'Specialized performance prompt',
          timeoutSeconds: 300,
        },
        trigger: { types: ['opened'] },
        concurrency: { cancelInProgress: false },
      }),
    });
    assertEquals(resCreateRule.status, 201);
    const createData = await resCreateRule.json();
    assertEquals(createData.rule.id, 'custom-rule');
    assertEquals(createData.rule.engineOverride?.model, 'gemini-3.8-flash');
    assertEquals(createData.rule.engineOverride?.systemPrompt, 'Specialized performance prompt');

    // Get specific rule
    const resGetRule = await api.request('/api/rules/custom-rule');
    assertEquals(resGetRule.status, 200);
    const getData = await resGetRule.json();
    assertEquals(getData.rule.name, 'Custom Test Rule');
    assertEquals(getData.rule.engineOverride?.model, 'gemini-3.8-flash');
    assertEquals(getData.rule.engineOverride?.timeoutSeconds, 300);

    // Update rule
    const resUpdateRule = await api.request('/api/rules/custom-rule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Custom Rule',
        enabled: false,
        engineOverride: {
          model: 'claude-3-7-sonnet',
          systemPrompt: 'Updated system prompt',
        },
      }),
    });
    assertEquals(resUpdateRule.status, 200);

    const resGetUpdated = await api.request('/api/rules/custom-rule');
    const updatedData = await resGetUpdated.json();
    assertEquals(updatedData.rule.name, 'Updated Custom Rule');
    assertEquals(updatedData.rule.enabled, false);
    assertEquals(updatedData.rule.engineOverride?.model, 'claude-3-7-sonnet');
    assertEquals(updatedData.rule.engineOverride?.systemPrompt, 'Updated system prompt');

    // Delete rule
    const resDeleteRule = await api.request('/api/rules/custom-rule', { method: 'DELETE' });
    assertEquals(resDeleteRule.status, 200);
    const resGetDeleted = await api.request('/api/rules/custom-rule');
    assertEquals(resGetDeleted.status, 404);

    // Test extended settings
    const resSettings = await api.request('/api/settings');
    assertEquals(resSettings.status, 200);
    const settingsData = await resSettings.json();
    assertEquals(settingsData.defaultRuleId, 'preset-correctness');
    assertEquals(settingsData.defaultBackendId, 'antigravity');
    assertEquals(settingsData.globalMaxConcurrency, 2);

    // 11. Test Triggering review with specific ruleIds
    const resRunRule = await api.request('/api/pulls/github%3Atest%2Frepo%231/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: ['preset-correctness'] }),
    });
    assertEquals(resRunRule.status, 200);
    const runRuleData = await resRunRule.json();
    assertEquals(runRuleData.success, true);
    assertEquals(Array.isArray(runRuleData.jobIds), true);

    // Wait for the mock job to finish
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 12. Test rule results API
    const resRuleResults = await api.request('/api/pulls/github%3Atest%2Frepo%231/rule-results');
    assertEquals(resRuleResults.status, 200);
    const ruleResultsData = await resRuleResults.json();
    assertEquals(Array.isArray(ruleResultsData.results), true);

    // 13. Test on-demand HTML export from JSON data
    const resExportHtml = await api.request('/api/reports/test-report-json/export.html');
    assertEquals(resExportHtml.status, 200);
    const exportHtmlText = await resExportHtml.text();
    assertEquals(exportHtmlText.includes('<!DOCTYPE html>'), true);

    // 14. Test triggers CRUD endpoints
    const resCreateTrigger = await api.request('/api/triggers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-trigger',
        name: 'Backend PR Trigger',
        repository: 'test/repo',
        paths: ['src/backend/**'],
        ruleIds: ['preset-correctness'],
        enabled: true,
      }),
    });
    assertEquals(resCreateTrigger.status, 201);

    const resGetTriggers = await api.request('/api/triggers');
    assertEquals(resGetTriggers.status, 200);
    const triggersData = await resGetTriggers.json();
    assertEquals(triggersData.triggers.length, 1);
    assertEquals(triggersData.triggers[0].name, 'Backend PR Trigger');
    assertEquals(triggersData.triggers[0].repository, 'test/repo');
    assertEquals(triggersData.triggers[0].paths, ['src/backend/**']);

    const resGetTrigger = await api.request('/api/triggers/test-trigger');
    assertEquals(resGetTrigger.status, 200);
    const triggerDetail = await resGetTrigger.json();
    assertEquals(triggerDetail.trigger.id, 'test-trigger');

    const resUpdateTrigger = await api.request('/api/triggers/test-trigger', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Backend Trigger',
        paths: ['src/backend/**', 'api/**'],
      }),
    });
    assertEquals(resUpdateTrigger.status, 200);

    const resDeleteTrigger = await api.request('/api/triggers/test-trigger', { method: 'DELETE' });
    assertEquals(resDeleteTrigger.status, 200);
    const resGetDeletedTrigger = await api.request('/api/triggers/test-trigger');
    assertEquals(resGetDeletedTrigger.status, 404);

    // 15. Test engine test endpoint
    const resMockTest = await api.request('/api/engines/mock/test', { method: 'POST' });
    assertEquals(resMockTest.status, 200);
    const mockTestData = await resMockTest.json();
    assertEquals(mockTestData.success, true);
    assertEquals(typeof mockTestData.version, 'string');

    const resMockExecTest = await api.request('/api/engines/mock/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'execution' }),
    });
    assertEquals(resMockExecTest.status, 200);
    const mockExecTestData = await resMockExecTest.json();
    assertEquals(mockExecTestData.success, true);
    assertEquals(mockExecTestData.mode, 'execution');
    assertEquals(typeof mockExecTestData.output, 'string');

    const resInvalidEngine = await api.request('/api/engines/unknown/test', { method: 'POST' });
    assertEquals(resInvalidEngine.status, 400);

    const resAgyTestNotFound = await api.request('/api/engines/antigravity/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binPath: '/non/existent/agy/path', mode: 'execution', effort: 'high' }),
    });
    assertEquals(resAgyTestNotFound.status, 200);
    const agyTestData = await resAgyTestNotFound.json();
    assertEquals(agyTestData.success, false);
    assertEquals(agyTestData.mode, 'execution');
    assertEquals(typeof agyTestData.error, 'string');

    // 16. Test enabledEngines in settings
    const resSettingsBefore = await api.request('/api/settings');
    assertEquals(resSettingsBefore.status, 200);
    const settingsBeforeData = await resSettingsBefore.json();
    assertEquals(Array.isArray(settingsBeforeData.enabledEngines), true);
    assertEquals(settingsBeforeData.enabledEngines.includes('antigravity'), true);

    const resUpdateSettingsEngines = await api.request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabledEngines: ['antigravity', 'mock'],
      }),
    });
    assertEquals(resUpdateSettingsEngines.status, 200);
    const updatedSettingsData = await resUpdateSettingsEngines.json();
    assertEquals(updatedSettingsData.enabledEngines, ['antigravity', 'mock', 'codex']);

    // 17. Test engineProfiles in settings and profile test endpoint
    assertEquals(Array.isArray(settingsBeforeData.engineProfiles), true);
    assertEquals(settingsBeforeData.engineProfiles.length >= 3, true);

    const customProfile = {
      id: 'prof-local-ollama',
      name: 'Local Ollama ornith-1.5',
      engineType: 'claude-code',
      isDefault: false,
      config: {
        binPath: 'claude',
        model: 'ornith-1.5:9b',
        effort: 'high',
        timeoutSeconds: 900,
        customEnv: {
          ANTHROPIC_BASE_URL: { value: 'http://localhost:11434', secret: false },
          ANTHROPIC_AUTH_TOKEN: { value: 'test-token-value', secret: true },
          ANTHROPIC_API_KEY: { value: 'test-token-value', secret: true },
        },
        maxTurns: 15,
      },
    };

    const resUpdateProfiles = await api.request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engineProfiles: [...settingsBeforeData.engineProfiles, customProfile],
      }),
    });
    assertEquals(resUpdateProfiles.status, 200);
    const updatedProfilesData = await resUpdateProfiles.json();
    const foundProfile = updatedProfilesData.engineProfiles.find((p: any) => p.id === 'prof-local-ollama');
    assertEquals(foundProfile !== undefined, true);
    assertEquals(foundProfile.config.customEnv.ANTHROPIC_BASE_URL.value, 'http://localhost:11434');
    assertEquals(foundProfile.config.customEnv.ANTHROPIC_AUTH_TOKEN.value, '');
    assertEquals(foundProfile.config.customEnv.ANTHROPIC_AUTH_TOKEN.configured, true);
    assertEquals(foundProfile.config.customEnv.ANTHROPIC_API_KEY.value, '');
    assertEquals(foundProfile.config.customEnv.ANTHROPIC_API_KEY.configured, true);

    const currentSettings = await settingsService.getAllSettings();
    const antigravityProfile = {
      id: 'prof-agy-env',
      name: 'Antigravity environment profile',
      engineType: 'antigravity',
      config: {
        ...currentSettings.engineSettings.antigravity,
        customEnv: {
          AGY_SECRET: { value: 'agy-secret-value', secret: true },
          AGY_VISIBLE: { value: 'visible-value', secret: false },
        },
      },
    };
    const codexProfile = {
      id: 'prof-codex-env',
      name: 'Codex environment profile',
      engineType: 'codex',
      config: {
        ...currentSettings.engineSettings.codex,
        customEnv: { CODEX_SECRET: { value: 'codex-secret-value', secret: true } },
      },
    };
    const resGenericEnvironment = await api.request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engineSettings: {
          ...currentSettings.engineSettings,
          antigravity: {
            ...currentSettings.engineSettings.antigravity,
            customEnv: {
              GLOBAL_AGY_SECRET: { value: 'global-secret-value', secret: true },
            },
          },
          codex: {
            ...currentSettings.engineSettings.codex,
            customEnv: { GLOBAL_CODEX_SECRET: { value: 'global-codex-secret', secret: true } },
          },
        },
        engineProfiles: [...updatedProfilesData.engineProfiles, antigravityProfile, codexProfile],
      }),
    });
    assertEquals(resGenericEnvironment.status, 200);
    const genericEnvironmentSettings = await resGenericEnvironment.json();
    const genericAgyProfile = genericEnvironmentSettings.engineProfiles.find(
      (profile: any) => profile.id === 'prof-agy-env',
    );
    assertEquals(genericEnvironmentSettings.engineSettings.antigravity.customEnv.GLOBAL_AGY_SECRET.value, '');
    assertEquals(genericEnvironmentSettings.engineSettings.antigravity.customEnv.GLOBAL_AGY_SECRET.configured, true);
    assertEquals(genericAgyProfile.config.customEnv.AGY_SECRET.value, '');
    assertEquals(genericAgyProfile.config.customEnv.AGY_SECRET.configured, true);
    assertEquals(genericAgyProfile.config.customEnv.AGY_VISIBLE.value, 'visible-value');
    const genericCodexProfile = genericEnvironmentSettings.engineProfiles.find(
      (profile: any) => profile.id === 'prof-codex-env',
    );
    assertEquals(genericEnvironmentSettings.engineSettings.codex.customEnv.GLOBAL_CODEX_SECRET.value, '');
    assertEquals(genericEnvironmentSettings.engineSettings.codex.customEnv.GLOBAL_CODEX_SECRET.configured, true);
    assertEquals(genericCodexProfile.config.customEnv.CODEX_SECRET.value, '');
    assertEquals(genericCodexProfile.config.customEnv.CODEX_SECRET.configured, true);

    const resGenericEnvironmentRoundTrip = await api.request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genericEnvironmentSettings),
    });
    assertEquals(resGenericEnvironmentRoundTrip.status, 200);
    const storedGenericEnvironment: any = await settingsService.getAllSettings();
    assertEquals(storedGenericEnvironment.engineSettings.antigravity.customEnv?.GLOBAL_AGY_SECRET, {
      value: 'global-secret-value',
      secret: true,
    });
    const storedAgyProfile = storedGenericEnvironment.engineProfiles.find(
      (profile: any) => profile.id === 'prof-agy-env',
    );
    assertEquals(storedAgyProfile?.engineType === 'antigravity' ? storedAgyProfile.config.customEnv?.AGY_SECRET : undefined, {
      value: 'agy-secret-value',
      secret: true,
    });
    assertEquals(storedGenericEnvironment.engineSettings.codex.customEnv?.GLOBAL_CODEX_SECRET, {
      value: 'global-codex-secret', secret: true,
    });
    const storedCodexProfile = storedGenericEnvironment.engineProfiles.find(
      (profile: any) => profile.id === 'prof-codex-env',
    );
    assertEquals(storedCodexProfile?.engineType === 'codex' ? storedCodexProfile.config.customEnv?.CODEX_SECRET : undefined, {
      value: 'codex-secret-value', secret: true,
    });

    // Test profile test endpoint via mock engine profile
    const mockProfile = {
      id: 'prof-test-mock',
      name: 'Custom Mock',
      engineType: 'mock',
      isDefault: false,
      config: { delayMs: 100 },
    };
    await api.request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engineProfiles: [...updatedProfilesData.engineProfiles, mockProfile],
      }),
    });
    const storedSettings = await settingsService.getAllSettings();
    const storedProfile = storedSettings.engineProfiles.find((profile) => profile.id === 'prof-local-ollama');
    const storedToken = storedProfile?.engineType === 'claude-code'
      ? storedProfile.config.customEnv?.ANTHROPIC_AUTH_TOKEN
      : undefined;
    assertEquals(typeof storedToken === 'string' ? storedToken : storedToken?.value, 'test-token-value');

    const resProfileTest = await api.request('/api/engines/prof-test-mock/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'execution' }),
    });
    assertEquals(resProfileTest.status, 200);
    const profileTestData = await resProfileTest.json();
    assertEquals(profileTestData.success, true);
    assertEquals(profileTestData.mode, 'execution');

    client.close();
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
