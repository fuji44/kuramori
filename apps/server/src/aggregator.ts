import { eq, and } from 'drizzle-orm';
import type { AppDatabase } from './db/index.ts';
import { reviewJobsTable, reviewReportsTable, reviewRuleResultsTable } from './db/schema.ts';
import { ReviewReportDataSchema } from '@kuramori/core';
import { compileD2ToSvg } from '@kuramori/runner';
import type {
  ReportStorage,
  ReviewReportData,
  ReviewComment,
  FindingCategory,
  Severity,
  RuleResult,
  RuleResultFinding,
} from '@kuramori/core';

export interface AggregateOptions {
  requestId: string;
  headSha: string;
  jobId: string;
}

/**
 * 同一 PR かつ同一 headSha に対する最新の各ルール結果を集約し、
 * 総合レビューレポートを作成して DB および storage に保存する。
 */
export async function aggregateRuleResults(
  db: AppDatabase,
  storage: ReportStorage,
  options: AggregateOptions
): Promise<ReviewReportData | null> {
  const { requestId, headSha, jobId } = options;

  // 当該 PR かつ当該 headSha の全ルール結果を取得
  const rows = await db
    .select()
    .from(reviewRuleResultsTable)
    .where(
      and(
        eq(reviewRuleResultsTable.requestId, requestId),
        eq(reviewRuleResultsTable.headSha, headSha)
      )
    );

  if (rows.length === 0) {
    return null;
  }

  // ルール毎に最新の RuleResult を抽出（同じルールが複数回実行された場合は最新のみ）
  const latestByRule = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    const existing = latestByRule.get(row.ruleId);
    if (!existing || existing.createdAt.localeCompare(row.createdAt) < 0) {
      latestByRule.set(row.ruleId, row);
    }
  }

  const ruleResults: RuleResult[] = [];
  const reviewReportsByRule = new Map<string, ReviewReportData>();
  for (const row of latestByRule.values()) {
    let findings: RuleResultFinding[] = [];
    try {
      findings = JSON.parse(row.findings);
    } catch {
      // JSON パースエラーは空配列
    }

    let metadata: Record<string, unknown> | undefined;
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata);
      } catch {
        // ignore
      }
    }
    if (metadata && typeof metadata === 'object' && 'reviewReport' in metadata) {
      const parsedReport = ReviewReportDataSchema.safeParse(metadata.reviewReport);
      if (parsedReport.success) {
        reviewReportsByRule.set(row.ruleId, parsedReport.data);
      }
    }

    ruleResults.push({
      id: row.id,
      jobId: row.jobId,
      requestId: row.requestId,
      ruleId: row.ruleId,
      ruleName: row.ruleName,
      category: row.category,
      headSha: row.headSha,
      verdict: row.verdict as 'PASS' | 'WARN' | 'FAIL',
      summary: row.summary,
      findings,
      metadata,
      createdAt: row.createdAt,
    });
  }

  // 1. 総合 Verdict の導出
  // いずれかのルールが FAIL -> REQUEST_CHANGES
  // FAIL はないが WARN -> COMMENT
  // 全て PASS -> APPROVE
  const hasFail = ruleResults.some((r) => r.verdict === 'FAIL');
  const hasWarn = ruleResults.some((r) => r.verdict === 'WARN');
  const overallVerdict: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES' = hasFail
    ? 'REQUEST_CHANGES'
    : hasWarn
    ? 'COMMENT'
    : 'APPROVE';

  // 2. 指摘の統合
  const comments: ReviewComment[] = [];
  const aggregateCommentIdsByRule = new Map<string, Map<string, string>>();
  let commentIndex = 1;

  for (const ruleResult of ruleResults) {
    for (const f of ruleResult.findings) {
      if (f.status === 'RESOLVED') {
        // RESOLVED 指摘は別途集約情報として保持（アクティブなコメント配列には含めず、または折りたたみ）
        continue;
      }

      let severity: Severity = 'P3';
      if (f.severity === 'CRITICAL') severity = 'P1';
      else if (f.severity === 'HIGH') severity = 'P2';
      else if (f.severity === 'MEDIUM') severity = 'P2';
      else if (f.severity === 'LOW') severity = 'P3';

      let category: FindingCategory = 'bug';
      if (
        f.category === 'security' ||
        f.category === 'architecture' ||
        f.category === 'performance' ||
        f.category === 'convention' ||
        f.category === 'spec'
      ) {
        category = f.category;
      }

      const commentId = `C${commentIndex++}`;
      const commentIds = aggregateCommentIdsByRule.get(ruleResult.ruleId) ?? new Map<string, string>();
      commentIds.set(f.id, commentId);
      aggregateCommentIdsByRule.set(ruleResult.ruleId, commentIds);

      const sourceComment = reviewReportsByRule.get(ruleResult.ruleId)?.comments.find((comment) => comment.id === f.id);
      comments.push(sourceComment
        ? { ...sourceComment, id: commentId, title: `[${ruleResult.ruleName}] ${sourceComment.title}` }
        : {
            id: commentId,
            path: f.path,
            line: f.line && f.line > 0 ? f.line : 1,
            side: 'RIGHT',
            severity,
            category,
            title: `[${ruleResult.ruleName}] ${f.title}`,
            body: f.body,
            suggestion: f.suggestion ? { snippet: f.suggestion } : undefined,
          });
    }
  }

  // 3. サマリの統合
  const summaries = ruleResults.map((r) => `【${r.ruleName}】${r.verdict}: ${r.summary}`).join('\n');
  const reportId = `report-${requestId.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}`;
  const now = new Date().toISOString();
  const representativeRule = ruleResults
    .filter((ruleResult) => reviewReportsByRule.has(ruleResult.ruleId))
    .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))[0];
  const representativeReport = representativeRule
    ? reviewReportsByRule.get(representativeRule.ruleId)
    : undefined;

  const diagramRule = ruleResults
    .filter((ruleResult) => {
      const rep = reviewReportsByRule.get(ruleResult.ruleId);
      return Boolean(rep?.diagram?.d2Source || rep?.diagram?.svg);
    })
    .sort((a, b) => {
      if (a.ruleId === 'preset-architecture' && b.ruleId !== 'preset-architecture') return -1;
      if (b.ruleId === 'preset-architecture' && a.ruleId !== 'preset-architecture') return 1;
      const svgA = reviewReportsByRule.get(a.ruleId)?.diagram?.svg;
      const svgB = reviewReportsByRule.get(b.ruleId)?.diagram?.svg;
      if (svgA && !svgB) return -1;
      if (!svgA && svgB) return 1;
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
    })[0] ?? representativeRule;

  const diagramReport = diagramRule ? reviewReportsByRule.get(diagramRule.ruleId) : undefined;
  const diagramCommentIds = diagramRule ? aggregateCommentIdsByRule.get(diagramRule.ruleId) : undefined;

  const diagram = diagramReport?.diagram
    ? {
        ...diagramReport.diagram,
        nodes: diagramReport.diagram.nodes.map((node) => ({
          ...node,
          commentId: node.commentId ? diagramCommentIds?.get(node.commentId) : undefined,
          commentIds: node.commentIds?.flatMap((id) => {
            const mappedId = diagramCommentIds?.get(id);
            return mappedId ? [mappedId] : [];
          }),
        })),
      }
    : undefined;

  if (diagram?.d2Source && !diagram.svg) {
    try {
      diagram.svg = await compileD2ToSvg(diagram.d2Source, { layout: 'tala' });
    } catch (err: unknown) {
      console.error('Failed to compile D2 diagram in aggregator', { error: String(err) });
    }
  }

  const callFlowRule = ruleResults
    .filter((ruleResult) => {
      const rep = reviewReportsByRule.get(ruleResult.ruleId);
      return (rep?.callFlow?.steps?.length ?? 0) > 0;
    })
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0] ?? representativeRule;

  const callFlowReport = callFlowRule ? reviewReportsByRule.get(callFlowRule.ruleId) : undefined;
  const callFlowCommentIds = callFlowRule ? aggregateCommentIdsByRule.get(callFlowRule.ruleId) : undefined;

  const callFlow = callFlowReport?.callFlow
    ? {
        ...callFlowReport.callFlow,
        steps: callFlowReport.callFlow.steps.map((step) => ({
          ...step,
          commentId: step.commentId ? callFlowCommentIds?.get(step.commentId) : undefined,
        })),
      }
    : undefined;
  const metrics = representativeReport?.metrics
    ? {
        ...representativeReport.metrics,
        findingsCount: comments.length,
        p1Count: comments.filter((comment) => comment.severity === 'P1').length,
        p2Count: comments.filter((comment) => comment.severity === 'P2').length,
        p3Count: comments.filter((comment) => comment.severity === 'P3').length,
      }
    : undefined;

  const appliedRules = ruleResults.map((r) => ({
    ruleId: r.ruleId,
    ruleName: r.ruleName,
    category: r.category,
    verdict: r.verdict,
    summary: r.summary,
    findingsCount: r.findings.filter((f) => f.status !== 'RESOLVED').length,
    completedAt: r.createdAt,
  }));

  const rawBrief = representativeReport?.summary?.brief;
  const briefObj = typeof rawBrief === 'object' && rawBrief !== null ? rawBrief : undefined;

  const reportData: ReviewReportData = {
    ...representativeReport,
    verdict: overallVerdict,
    appliedRules,
    summary: {
      ...representativeReport?.summary,
      brief: {
        problem: summaries,
        approach: briefObj?.approach ?? '詳細レポートに修正方針の記載がありません。',
        blastRadius: briefObj?.blastRadius ?? '影響範囲の記載がありません。',
      },
      changedCode: representativeReport?.summary?.changedCode ?? [],
      reachPaths: [...new Set(ruleResults.flatMap((ruleResult) =>
        reviewReportsByRule.get(ruleResult.ruleId)?.summary.reachPaths ?? []
      ))],
    },
    comments,
    createdAt: now,
    diagram,
    callFlow,
    metrics,
  };

  // DB の review_reports に保存
  await db.insert(reviewReportsTable).values({
    id: reportId,
    jobId,
    requestId,
    userId: 'default',
    summary: summaries,
    verdict: overallVerdict,
    createdAt: now,
  });

  await db
    .update(reviewJobsTable)
    .set({ reportId })
    .where(
      and(
        eq(reviewJobsTable.requestId, requestId),
        eq(reviewJobsTable.headSha, headSha)
      )
    );

  // Storage に保存（Web UI からの取得用）
  await storage.saveReportData(reportId, reportData);

  return reportData;
}
