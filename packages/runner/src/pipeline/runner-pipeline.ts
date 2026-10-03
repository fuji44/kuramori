import { dirname, fromFileUrl, join, resolve } from '@std/path';
import {
  type ReviewExecutionContext,
  type ReviewExecutionResult,
  type RuleResult,
  type RuleResultFinding,
  type RuleResultVerdict,
  type FindingSeverity,
  getReviewReportJsonSchema,
} from '@kuramori/core';
import { collectPreFlightContext } from '../context/collector.ts';
import {
  validateReviewReportData,
  auditFileAnchors,
  formatViolationsForPrompt,
} from '../gatekeeper/validator.ts';
import { compileD2ToSvg, generateD2FromDiagram } from '../diagram/d2-compiler.ts';
import { generateStandaloneReviewHtml } from '../report/html-generator.ts';

const __filename = fromFileUrl(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_MD_PATH = join(__dirname, '../../skills/pr-review/SKILL.md');

/**
 * Pre-flight: コンテキスト収集と作業ディレクトリへの配置
 */
export async function executePreFlight(
  context: ReviewExecutionContext,
  log: (msg: string) => Promise<void>
): Promise<void> {
  await log(`[Pre-flight] Collecting context for ${context.repository}#${context.number}...`);
  const preFlightData = await collectPreFlightContext(context.repository, context.number);

  const fullPreFlight = {
    ...preFlightData,
    rule: context.rule
      ? {
          id: context.rule.id,
          name: context.rule.name,
          category: context.rule.category,
          instructions: context.rule.instructions,
        }
      : undefined,
    interCommitDiff: context.interCommitDiff,
    previousFindings: context.previousFindings,
  };

  const contextJsonStr = JSON.stringify(fullPreFlight, null, 2);
  const worktreeContextPath = resolve(context.worktreePath, 'context.json');
  const outputContextPath = resolve(context.outputDir, 'context.json');

  await Deno.writeTextFile(worktreeContextPath, contextJsonStr);
  await Deno.writeTextFile(outputContextPath, contextJsonStr);
  await log(`[Pre-flight] context.json written to worktree and output dir.`);
}

/**
 * AI エージェントに渡すレビュー指示プロンプトを構築する
 */
export async function buildReviewPrompt(
  context: ReviewExecutionContext,
  systemPrompt?: string,
  outputSchema?: unknown
): Promise<string> {
  let skillInstructions = '';
  try {
    skillInstructions = await Deno.readTextFile(SKILL_MD_PATH);
  } catch {
    skillInstructions = 'Perform deep PR review based on context.json and output structured review JSON conforming to the schema';
  }

  const systemSection = systemPrompt?.trim()
    ? `\n=== SYSTEM INSTRUCTIONS (ROLE & BEHAVIOR) ===\n${systemPrompt.trim()}\n`
    : '';

  let ruleSpecificPrompt = '';
  if (context.rule) {
    ruleSpecificPrompt = `
=== SPECIALIZED REVIEW RULE: ${context.rule.name} (Category: ${context.rule.category}) ===
You MUST focus heavily on the following specific instructions for this review:
${context.rule.instructions}
`;
  }

  const jsonSchema = JSON.stringify(outputSchema ?? getReviewReportJsonSchema(), null, 2);

  return `
You are an autonomous senior code reviewer performing a deep review of Pull Request ${context.repository}#${context.number}.
${systemSection}
${ruleSpecificPrompt}
=== INSTRUCTIONS & SKILL GUIDELINES ===
${skillInstructions}

=== JSON SCHEMA REQUIREMENT (ZOD 4 SCHEMA) ===
Your final output MUST strictly adhere to this JSON Schema:
${jsonSchema}

=== EXECUTION TARGETS & CONSTRAINTS ===
- Pre-flight context is available at: context.json (in current working directory)
- Mode: Output ONLY valid JSON adhering strictly to the JSON Schema. Do NOT generate HTML. Do NOT push to git or GitHub.
- CRITICAL: Do NOT spawn background tasks or exit with messages like "Waiting...". You must inspect files, perform your review synchronously, and return valid JSON output BEFORE finishing your response.

Begin by reading context.json now.
`;
}

/**
 * Post-flight: Gatekeeper による構造化レビュー結果の検収
 */
export async function executePostFlight(
  context: ReviewExecutionContext,
  log: (msg: string) => Promise<void>,
  stdout?: string
): Promise<ReviewExecutionResult> {
  await log(`[Post-flight] Gatekeeper auditing structured review output...`);

  let rawJsonText: string | null = null;
  const primaryJsonPath = resolve(context.outputDir, 'review.json');

  // 1. 標準出力からの JSON 抽出を第1優先
  if (stdout) {
    const jsonMatch = stdout.match(/```json\s*([\s\S]*?)\s*```/) || stdout.match(/(\{[\s\S]*"verdict"[\s\S]*\})/);
    if (jsonMatch) {
      rawJsonText = jsonMatch[1].trim();
      await log(`[Post-flight] Extracted structured review JSON from AI stdout.`);
    }
  }

  // 2. ディスク上のファイル（下位互換性およびデバッグ用）をフォールバックとして探索
  if (!rawJsonText) {
    const fallbackJsonPath = resolve(context.worktreePath, 'review.json');
    try {
      rawJsonText = await Deno.readTextFile(primaryJsonPath);
    } catch {
      try {
        rawJsonText = await Deno.readTextFile(fallbackJsonPath);
      } catch {
        try {
          for await (const entry of Deno.readDir(resolve(context.worktreePath))) {
            if (entry.name === 'review.json') {
              const foundPath = resolve(context.worktreePath, entry.name);
              rawJsonText = await Deno.readTextFile(foundPath);
              break;
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (!rawJsonText) {
    const errorMsg = 'Gatekeeper audit failed: structured review output was not produced by AI engine.';
    await log(`[Post-flight ERROR] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      ruleResult: {
        id: crypto.randomUUID(),
        jobId: context.jobId,
        requestId: context.requestId,
        ruleId: context.rule?.id ?? 'default',
        ruleName: context.rule?.name ?? 'General Review',
        category: context.rule?.category ?? 'general',
        headSha: context.headSha,
        verdict: 'FAIL',
        summary: errorMsg,
        findings: [],
        createdAt: new Date().toISOString(),
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch (err) {
    const errorMsg = `Gatekeeper audit failed: review output contains invalid JSON: ${err}`;
    await log(`[Post-flight ERROR] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      ruleResult: {
        id: crypto.randomUUID(),
        jobId: context.jobId,
        requestId: context.requestId,
        ruleId: context.rule?.id ?? 'default',
        ruleName: context.rule?.name ?? 'General Review',
        category: context.rule?.category ?? 'general',
        headSha: context.headSha,
        verdict: 'FAIL',
        summary: errorMsg,
        findings: [],
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    if (!record.createdAt || typeof record.createdAt !== 'string' || Number.isNaN(Date.parse(record.createdAt))) {
      record.createdAt = new Date().toISOString();
    }
  }

  const validationResult = validateReviewReportData(parsed);
  if (!validationResult.success || !validationResult.data) {
    const promptFeedback = formatViolationsForPrompt(validationResult.violations || []);
    const errorMsg = `Gatekeeper validation failed:\n${promptFeedback}`;
    await log(`[Post-flight ERROR] ${errorMsg}`);

    const extractedFindings: RuleResultFinding[] = [];
    if (parsed && typeof parsed === 'object' && 'comments' in parsed) {
      const parsedRecord = parsed as { comments?: unknown };
      if (Array.isArray(parsedRecord.comments)) {
        try {
          const rawComments: unknown[] = parsedRecord.comments;
          for (const c of rawComments) {
            if (c && typeof c === 'object') {
              const commentObj = c as Record<string, unknown>;
              extractedFindings.push({
                id: typeof commentObj.id === 'string' ? commentObj.id : crypto.randomUUID(),
                ruleId: context.rule?.id ?? 'default',
                path: typeof commentObj.path === 'string' ? commentObj.path : 'unknown',
                line: typeof commentObj.line === 'number' ? commentObj.line : undefined,
                title: typeof commentObj.title === 'string' ? commentObj.title : 'Unverified finding (Gatekeeper failed)',
                body: typeof commentObj.body === 'string' ? commentObj.body : '',
                category: typeof commentObj.category === 'string' ? commentObj.category : 'bug',
                severity: commentObj.severity === 'P1'
                  ? 'CRITICAL'
                  : commentObj.severity === 'P2'
                  ? 'HIGH'
                  : commentObj.severity === 'P3'
                  ? 'LOW'
                  : (typeof commentObj.severity === 'string' &&
                    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(commentObj.severity.toUpperCase()))
                  ? (commentObj.severity.toUpperCase() as FindingSeverity)
                  : 'MEDIUM',
                status: 'NEW',
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    return {
      success: false,
      error: errorMsg,
      ruleResult: {
        id: crypto.randomUUID(),
        jobId: context.jobId,
        requestId: context.requestId,
        ruleId: context.rule?.id ?? 'default',
        ruleName: context.rule?.name ?? 'General Review',
        category: context.rule?.category ?? 'general',
        headSha: context.headSha,
        verdict: 'FAIL',
        summary: `Gatekeeper 検証に失敗しました: ${validationResult.violations?.[0]?.message ?? errorMsg}`,
        findings: extractedFindings,
        metadata: { gatekeeperError: errorMsg },
        createdAt: new Date().toISOString(),
      },
    };
  }

  const reportData = validationResult.data;

  // 差分ファイルのアンカー検証
  try {
    const contextJsonPath = resolve(context.outputDir, 'context.json');
    const contextContent = await Deno.readTextFile(contextJsonPath);
    const preFlight = JSON.parse(contextContent);
    const diffText = preFlight.diff as string;

    const changedFiles = extractChangedFilesFromDiff(diffText);
    const anchorViolations = auditFileAnchors(reportData.comments, changedFiles);

    if (anchorViolations.length > 0) {
      const warnMsg = `Gatekeeper Anchor Warning: Some comments refer to files outside diff:\n${formatViolationsForPrompt(anchorViolations)}`;
      await log(`[Post-flight WARN] ${warnMsg}`);
      // ここでは警告ログに留め、レポート自体は承認（または必要に応じてフィルタ）
    }
  } catch {
    // 差分取得不可時はスキップ
  }

  // D2 ダイアグラムの SVG コンパイル
  if (reportData.diagram) {
    try {
      const d2Source = reportData.diagram.d2Source || generateD2FromDiagram(reportData.diagram);
      reportData.diagram.d2Source = d2Source;
      const svg = await compileD2ToSvg(d2Source);
      reportData.diagram.svg = svg;
      await log(`[Post-flight] D2 diagram successfully compiled to SVG.`);
    } catch (d2Err) {
      await log(`[Post-flight WARN] Failed to compile D2 diagram to SVG: ${d2Err}`);
    }
  }

  // 更新された reportData を保存（デバッグ・キャッシュ用）
  try {
    await Deno.writeTextFile(primaryJsonPath, JSON.stringify(reportData, null, 2));
  } catch {
    // 書き込み失敗してもメモリ上の結果があるため致命的エラーとしない
  }

  // スタンドアロン HTML レポートの自動生成・保存
  const htmlReportPath = resolve(context.outputDir, 'report.html');
  const standaloneHtml = generateStandaloneReviewHtml(reportData, {
    repo: context.repository,
    prNumber: context.number,
  });
  await Deno.writeTextFile(htmlReportPath, standaloneHtml);
  await log(`[Post-flight] Standalone HTML report generated at ${htmlReportPath}`);

  await log(`[Post-flight SUCCESS] Gatekeeper validation passed! Verdict: ${reportData.verdict}, Findings: ${reportData.comments.length}`);

  const briefText = typeof reportData.summary.brief === 'string'
    ? reportData.summary.brief
    : (reportData.summary.brief.problem ?? reportData.summary.brief.approach ?? '');

  // RuleResult の構築
  const ruleId = context.rule?.id ?? 'default';
  const ruleName = context.rule?.name ?? 'General Review';
  const category = context.rule?.category ?? 'general';

  let ruleVerdict: RuleResultVerdict = 'PASS';
  if (reportData.verdict === 'REQUEST_CHANGES') {
    ruleVerdict = 'FAIL';
  } else if (reportData.verdict === 'COMMENT') {
    ruleVerdict = 'WARN';
  }

  const previousFindings = context.previousFindings ?? [];
  const findings: RuleResultFinding[] = reportData.comments.map((c, idx) => {
    const isPersisting = previousFindings.some(
      (pf) => pf.path === c.path && (pf.title === c.title || (pf.line !== undefined && c.line !== undefined && Math.abs(pf.line - c.line) <= 3))
    );

    let severity: FindingSeverity = 'MEDIUM';
    if (c.severity === 'P1') severity = 'CRITICAL';
    else if (c.severity === 'P2') severity = 'HIGH';
    else if (c.severity === 'P3') severity = 'LOW';

    return {
      id: c.id || `F${idx + 1}`,
      ruleId,
      category: c.category ?? category,
      title: c.title,
      path: c.path,
      line: c.line,
      severity,
      status: isPersisting ? 'PERSISTING' : 'NEW',
      body: c.body,
      suggestion: c.suggestion?.replacement ?? c.suggestion?.snippet,
    };
  });

  // 過去の指摘で今回解消されたものを RESOLVED として記録
  for (const pf of previousFindings) {
    const stillExists = findings.some((f) => f.path === pf.path && f.title === pf.title);
    if (!stillExists) {
      findings.push({
        id: pf.id,
        ruleId: pf.ruleId,
        category,
        title: pf.title,
        path: pf.path,
        line: pf.line,
        severity: 'INFO',
        status: 'RESOLVED',
        body: pf.body,
      });
    }
  }

  const ruleResult: RuleResult = {
    ruleId,
    ruleName,
    category,
    headSha: context.headSha,
    verdict: ruleVerdict,
    summary: briefText,
    findings,
  };

  return {
    success: true,
    verdict: reportData.verdict,
    summary: briefText,
    reportJsonPath: primaryJsonPath,
    reportHtmlPath: htmlReportPath,
    reportData,
    ruleResult,
  };
}

/**
 * Unified diff 文字列から変更ファイルパス一覧を抽出する
 */
export function extractChangedFilesFromDiff(diffText: string): Set<string> {
  const files = new Set<string>();
  const lines = diffText.split('\n');
  for (const line of lines) {
    if (line.startsWith('diff --git a/')) {
      const parts = line.split(' ');
      if (parts.length >= 4) {
        const bPath = parts[3].replace(/^b\//, '');
        files.add(bPath);
      }
    }
  }
  return files;
}
