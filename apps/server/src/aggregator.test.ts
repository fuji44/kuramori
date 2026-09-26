import { assertEquals } from '@std/assert';
import { createDb, initDatabase } from './db/index.ts';
import { reviewRuleResultsTable, reviewRequestsTable, reviewJobsTable } from './db/schema.ts';
import { LocalFileReportStorage } from '@kuramori/core';
import { aggregateRuleResults } from './aggregator.ts';

Deno.test('Aggregator - merges rule results and derives correct verdict', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'aggregator-test-' });
  const dbUrl = `file:${tempDir}/test.db`;
  const reportsDir = `${tempDir}/reports`;

  try {
    const { db, client } = createDb(dbUrl);
    await initDatabase(client);
    const storage = new LocalFileReportStorage(reportsDir);

    const now = new Date().toISOString();
    const requestId = 'github:org/repo#10';
    const headSha = 'commit-123';

    // PR レコードの作成
    await db.insert(reviewRequestsTable).values({
      id: requestId,
      userId: 'default',
      provider: 'github',
      repository: 'org/repo',
      number: 10,
      title: 'feat: test aggregator',
      author: 'user',
      url: 'https://github.com/org/repo/pull/10',
      sourceBranch: 'feature',
      targetBranch: 'main',
      headSha,
      isDraft: false,
      isOwn: false,
      state: 'open',
      createdAt: now,
      updatedAt: now,
    });

    // ジョブレコードの作成
    const job1Id = 'job-1';
    const job2Id = 'job-2';
    await db.insert(reviewJobsTable).values({
      id: job1Id,
      requestId,
      userId: 'default',
      status: 'completed',
      engine: 'antigravity',
      ruleId: 'preset-correctness',
      ruleName: 'Correctness & Quality',
      ruleCategory: 'correctness',
      headSha,
      startedAt: now,
      completedAt: now,
    });
    await db.insert(reviewJobsTable).values({
      id: job2Id,
      requestId,
      userId: 'default',
      status: 'completed',
      engine: 'antigravity',
      ruleId: 'preset-security',
      ruleName: 'Security Audit',
      ruleCategory: 'security',
      headSha,
      startedAt: now,
      completedAt: now,
    });

    // 1. Correctness ルール結果: PASS
    await db.insert(reviewRuleResultsTable).values({
      id: 'res-1',
      jobId: job1Id,
      requestId,
      ruleId: 'preset-correctness',
      ruleName: 'Correctness & Quality',
      category: 'correctness',
      headSha,
      verdict: 'PASS',
      summary: 'ロジックに問題はありません。',
      findings: JSON.stringify([]),
      createdAt: now,
    });

    // 2. Security ルール結果: FAIL (CRITICAL 脆弱性あり)
    await db.insert(reviewRuleResultsTable).values({
      id: 'res-2',
      jobId: job2Id,
      requestId,
      ruleId: 'preset-security',
      ruleName: 'Security Audit',
      category: 'security',
      headSha,
      verdict: 'FAIL',
      summary: 'SQL インジェクション脆弱性を検出しました。',
      findings: JSON.stringify([
        {
          id: 'F1',
          ruleId: 'preset-security',
          category: 'security',
          title: 'SQL Injection detected in query builder',
          path: 'src/db.ts',
          line: 42,
          severity: 'CRITICAL',
          status: 'NEW',
          body: 'ユーザー入力を直接 SQL 文字列に結合しています。',
        },
      ]),
      createdAt: now,
    });

    // 集約を実行
    const report = await aggregateRuleResults(db, storage, {
      requestId,
      headSha,
      jobId: job2Id,
    });

    assertEquals(report !== null, true);
    // 1つでも FAIL があれば REQUEST_CHANGES
    assertEquals(report?.verdict, 'REQUEST_CHANGES');
    // コメントが統合されている
    assertEquals(report?.comments.length, 1);
    assertEquals(report?.comments[0].severity, 'P1');
    assertEquals(report?.comments[0].category, 'security');
    assertEquals(report?.comments[0].title.includes('Security Audit'), true);

    client.close();
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
