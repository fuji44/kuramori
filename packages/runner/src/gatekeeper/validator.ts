import {
  ReviewReportDataSchema,
  type ReviewReportData,
  type ReviewComment,
} from "@review-base/core";

export interface GatekeeperViolation {
  path: string;
  message: string;
  code: string;
}

export interface GatekeeperValidationResult {
  success: boolean;
  data?: ReviewReportData;
  violations?: GatekeeperViolation[];
}

/**
 * AI が出力した review.json データを検証・検収する
 */
export function validateReviewReportData(
  rawData: unknown
): GatekeeperValidationResult {
  const parseResult = ReviewReportDataSchema.safeParse(rawData);

  if (!parseResult.success) {
    const violations: GatekeeperViolation[] = parseResult.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return {
      success: false,
      violations,
    };
  }

  const data = parseResult.data;

  // 安定索引ID (C1, C2...) の一意性とフォーマットの追加監査
  const idViolations = auditCommentIds(data.comments);
  if (idViolations.length > 0) {
    return {
      success: false,
      violations: idViolations,
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * 指摘ID (C1, C2...) の一意性と連番ルールを監査する
 */
export function auditCommentIds(comments: ReviewComment[]): GatekeeperViolation[] {
  const violations: GatekeeperViolation[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    if (seenIds.has(comment.id)) {
      violations.push({
        path: `comments.${i}.id`,
        message: `重複した指摘ID '${comment.id}' が検出されました。IDは一意である必要があります。`,
        code: "duplicate_id",
      });
    }
    seenIds.add(comment.id);
  }

  return violations;
}

/**
 * 指摘の対象ファイルが PR の変更ファイル一覧に存在するか検証する
 */
export function auditFileAnchors(
  comments: ReviewComment[],
  changedFiles: Set<string>
): GatekeeperViolation[] {
  const violations: GatekeeperViolation[] = [];

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    if (!changedFiles.has(comment.path)) {
      violations.push({
        path: `comments.${i}.path`,
        message: `指摘対象ファイル '${comment.path}' は PR の変更差分内に存在しません。`,
        code: "file_not_in_diff",
      });
    }
  }

  return violations;
}

/**
 * AI にスキーマ違反箇所を再修正させるためのプロンプトメッセージを生成する
 */
export function formatViolationsForPrompt(violations: GatekeeperViolation[]): string {
  const lines = violations.map(
    (v) => `- フィールド \`${v.path}\`: ${v.message} (エラーコード: ${v.code})`
  );

  return [
    "出力された review.json のスキーマ検証で以下のエラーが検出されました。",
    "以下の指摘内容を修正し、完全な review.json を再出力してください：",
    "",
    ...lines,
  ].join("\n");
}
