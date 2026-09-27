import { z } from "zod";

/**
 * 指摘の重要度
 * - P1: Blocker (バグ、仕様違反、セキュリティ脆弱性など直ちに修正が必要)
 * - P2: Warning (潜在リスク、エッジケース、設計/保守性の改善推奨)
 * - P3: Note (軽微な改善、命名、スタイル提案など任意対応)
 */
export const SeveritySchema = z.enum(["P1", "P2", "P3"]);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * 指摘のタグ語彙 (kuramori-pr-review-contract 準拠)
 */
export const FindingTagSchema = z.enum([
  "MUST",
  "Q",
  "IMO",
  "NR",
  "NIT",
  "FYI",
  "PRAISE",
  "THOUGHT",
]);
export type FindingTag = z.infer<typeof FindingTagSchema>;

/**
 * 判定 (Lens Verdict: タグとは直交する採用・展開判定)
 * - escalate: 最上段に展開、レビュアー必読
 * - promote: 次に展開
 * - keep: 折りたたみ表示
 * - drop: 折りたたんで件数保持 (消さない)
 */
export const LensVerdictSchema = z.enum(["escalate", "promote", "keep", "drop"]);
export type LensVerdict = z.infer<typeof LensVerdictSchema>;

export const LensSchema = z.object({
  verdict: LensVerdictSchema,
  reason: z.string(),
  rule: z.string().nullable().optional(),
});
export type Lens = z.infer<typeof LensSchema>;

/**
 * 指摘のカテゴリ
 */
export const FindingCategorySchema = z.enum([
  "bug",
  "spec",
  "convention",
  "security",
  "architecture",
  "performance",
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

/**
 * コミット固定パーマリンク・位置追跡
 */
export const FindingLocationSchema = z.object({
  path: z.string().optional(),
  line: z.number().int().optional(),
  side: z.enum(["RIGHT", "LEFT"]).default("RIGHT"),
  origin: z
    .object({
      headSha: z.string().optional(),
      line: z.number().int().optional(),
      diffHunk: z.string().nullable().optional(),
    })
    .optional(),
  current: z
    .object({
      headSha: z.string().optional(),
      line: z.number().int().optional(),
    })
    .nullable()
    .optional(),
  outdated: z.boolean().default(false),
});
export type FindingLocation = z.infer<typeof FindingLocationSchema>;

/**
 * インラインレビュー指摘
 */
export const ReviewCommentSchema = z.object({
  id: z.string().regex(/^C\d+$/, "IDは C1, C2 のような形式である必要があります"),
  path: z.string().min(1, "ファイルパスは必須です"),
  line: z.number().int().positive("行番号は1以上の正の整数である必要があります"),
  side: z.enum(["RIGHT", "LEFT"]).default("RIGHT"),
  severity: SeveritySchema,
  category: FindingCategorySchema,
  tag: FindingTagSchema.optional(),
  lens: LensSchema.optional(),
  title: z.string().min(1, "指摘タイトルは必須です"),
  body: z.string().min(1, "指摘詳細は必須です"),
  // 定義リスト: 問題 / 改善案 / 既存レビューとの関係
  problem: z.string().optional(),
  proposal: z.string().optional(),
  relationToExisting: z.string().nullable().optional(),
  location: FindingLocationSchema.optional(),
  suggestion: z
    .object({
      snippet: z.string().optional(),
      replacement: z.string().optional(),
    })
    .nullable()
    .optional(),
});
export type ReviewComment = z.infer<typeof ReviewCommentSchema>;

/**
 * 要約の因果連鎖・発動条件
 */
export const ReviewMechanismSchema = z.object({
  why: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  whereTheFixSits: z.string().optional(),
  unchanged: z.string().optional(),
});
export type ReviewMechanism = z.infer<typeof ReviewMechanismSchema>;

/**
 * PR メタデータ
 */
export const ReviewPrMetaSchema = z.object({
  owner: z.string().optional(),
  repo: z.string().optional(),
  number: z.number().int().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  headSha: z.string().optional(),
  baseRef: z.string().optional(),
  author: z.string().optional(),
  milestone: z.string().nullable().optional(),
  storyUrl: z.string().nullable().optional(),
});
export type ReviewPrMeta = z.infer<typeof ReviewPrMetaSchema>;

/**
 * 変更コード表エントリ
 */
export const ChangedCodeItemSchema = z.object({
  layer: z.string().optional(),
  file: z.string(),
  role: z.string().optional(),
});
export type ChangedCodeItem = z.infer<typeof ChangedCodeItemSchema>;

export const ChangedCodeSchema = z.union([
  z.string(),
  z.array(ChangedCodeItemSchema),
]);

/**
 * 作者の設計判断エントリ
 */
export const AuthorsDecisionItemSchema = z.object({
  decision: z.string(),
  commentId: z.string().regex(/^C\d+$/).optional(),
});
export type AuthorsDecisionItem = z.infer<typeof AuthorsDecisionItemSchema>;

/**
 * レビュー総括サマリ (一言まとめ: problem / approach / blastRadius)
 */
export const ReviewSummaryBriefObjectSchema = z.object({
  problem: z.string().optional(),
  approach: z.string().optional(),
  blastRadius: z.string().optional(),
});

export const ReviewSummaryBriefSchema = z.union([
  z.string(),
  ReviewSummaryBriefObjectSchema,
]);

export const ReviewSummarySchema = z.object({
  brief: ReviewSummaryBriefSchema,
  changedCode: ChangedCodeSchema,
  reachPaths: z.array(z.string()).default([]),
  blastRadius: z.string().optional(),
  mechanism: ReviewMechanismSchema.optional(),
  authorsDecisions: z.array(AuthorsDecisionItemSchema).optional(),
});
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

/**
 * ダイアグラムノード (D2 / 互換用)
 */
export const DiagramNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["modified", "affected", "dependency"]).default("modified"),
  severity: SeveritySchema.optional(),
  commentId: z.string().optional(),
  commentIds: z.array(z.string()).optional(),
});
export type DiagramNode = z.infer<typeof DiagramNodeSchema>;

/**
 * ダイアグラムエッジ (D2 / 互換用)
 */
export const DiagramEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;

/**
 * D2 対応ダイアグラム構造
 */
export const DiagramSchema = z.object({
  d2Source: z.string().optional(),
  svg: z.string().optional(),
  nodes: z.array(DiagramNodeSchema).default([]),
  edges: z.array(DiagramEdgeSchema).default([]),
});
export type Diagram = z.infer<typeof DiagramSchema>;

/**
 * ステップフロー (処理シーケンス / タイムライン)
 */
export const CallFlowStepSchema = z.object({
  step: z.number().int().positive(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["unchanged", "modified", "added", "affected"]).default("modified"),
  commentId: z.string().regex(/^C\d+$/).optional(),
});
export type CallFlowStep = z.infer<typeof CallFlowStepSchema>;

export const CallFlowSchema = z.object({
  steps: z.array(CallFlowStepSchema).default([]),
});
export type CallFlow = z.infer<typeof CallFlowSchema>;

/**
 * レビュー指標
 */
export const ReviewMetricsSchema = z.object({
  filesAnalyzed: z.number().int().nonnegative().default(0),
  findingsCount: z.number().int().nonnegative().default(0),
  p1Count: z.number().int().nonnegative().default(0),
  p2Count: z.number().int().nonnegative().default(0),
  p3Count: z.number().int().nonnegative().default(0),
});
export type ReviewMetrics = z.infer<typeof ReviewMetricsSchema>;

/**
 * 相互検証の透明性 (仕様ソースや省略された観点)
 */
export const ReviewTransparencySchema = z.object({
  rawFindingCount: z.number().int().nonnegative().optional(),
  aggregatedCount: z.number().int().nonnegative().optional(),
  referencedSpecs: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().optional(),
        via: z.string().optional(),
      })
    )
    .default([]),
  unreferencedSpecs: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
        supersededBy: z.string().optional(),
      })
    )
    .default([]),
});
export type ReviewTransparency = z.infer<typeof ReviewTransparencySchema>;

/**
 * レポートに統合された各レビュールールの判定結果サマリ
 */
export const AppliedRuleSummarySchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  category: z.string().default('general'),
  verdict: z.enum(['PASS', 'WARN', 'FAIL']),
  summary: z.string(),
  findingsCount: z.number().int().nonnegative().default(0),
  completedAt: z.string().optional(),
});
export type AppliedRuleSummary = z.infer<typeof AppliedRuleSummarySchema>;

/**
 * レビュー合否判定
 */
export const ReviewVerdictSchema = z.enum(["APPROVE", "COMMENT", "REQUEST_CHANGES"]);
export type ReviewVerdictType = z.infer<typeof ReviewVerdictSchema>;

/**
 * レビューレポート完全データ構造 (review.json)
 */
export const ReviewReportDataSchema = z.object({
  pr: ReviewPrMetaSchema.optional(),
  verdict: ReviewVerdictSchema,
  summary: ReviewSummarySchema,
  comments: z.array(ReviewCommentSchema).default([]),
  diagram: DiagramSchema.optional(),
  callFlow: CallFlowSchema.optional(),
  metrics: ReviewMetricsSchema.optional(),
  transparency: ReviewTransparencySchema.optional(),
  appliedRules: z.array(AppliedRuleSummarySchema).optional(),
  createdAt: z.string().datetime().optional(),
});
export type ReviewReportData = z.infer<typeof ReviewReportDataSchema>;

/**
 * AI プロンプト用の JSON Schema を生成する
 */
export function getReviewReportJsonSchema() {
  return z.toJSONSchema(ReviewReportDataSchema);
}
