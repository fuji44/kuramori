import { join } from '@std/path';
import type {
  ReviewEngine,
  ReviewExecutionContext,
  ReviewExecutionResult,
  ReviewReportData,
} from '@kuramori/core';

export interface MockReviewEngineOptions {
  delayMs?: number;
}

export class MockReviewEngine implements ReviewEngine {
  readonly name = 'mock';
  private readonly delayMs: number;

  constructor(options?: MockReviewEngineOptions) {
    this.delayMs = options?.delayMs ?? 800;
  }

  async execute(context: ReviewExecutionContext): Promise<ReviewExecutionResult> {
    const jsonReportPath = join(context.outputDir, 'review.json');
    const htmlReportPath = join(context.outputDir, 'report.html');
    const log = async (msg: string) => {
      const line = `[${new Date().toISOString()}] ${msg}\n`;
      await Deno.writeTextFile(context.logPath, line, { append: true, create: true });
    };

    await log(`[MockEngine] Starting mock review for ${context.repository}#${context.number}...`);
    await log(`[MockEngine] Scanning diff for head SHA: ${context.headSha}...`);

    // Simulated processing delay
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    const reportData: ReviewReportData = {
      verdict: 'APPROVE',
      summary: {
        brief: '対象ブランチの変更点を確認しました。重大な問題は検出されませんでした。',
        changedCode: 'インターフェースおよびストレージ実装の拡張',
        reachPaths: ['packages/core/src/'],
      },
      comments: [
        {
          id: 'C1',
          path: 'packages/core/src/index.ts',
          line: 5,
          side: 'RIGHT',
          severity: 'P3',
          category: 'convention',
          title: 'エクスポート構成の整理',
          body: '型定義とインターフェースのエクスポートが整然と維持されていることを確認しました。',
        },
      ],
      diagram: {
        nodes: [
          { id: 'storage', label: 'ReportStorage', type: 'modified' },
          { id: 'engine', label: 'ReviewEngine', type: 'affected' },
        ],
        edges: [
          { from: 'engine', to: 'storage', label: 'saves to' },
        ],
      },
      callFlow: {
        steps: [
          { step: 1, title: 'Pre-flight context collected', status: 'unchanged' },
          { step: 2, title: 'Deep review performed', status: 'modified', commentId: 'C1' },
          { step: 3, title: 'Gatekeeper audit passed', status: 'added' },
        ],
      },
      metrics: {
        filesAnalyzed: 2,
        findingsCount: 1,
        p1Count: 0,
        p2Count: 0,
        p3Count: 1,
      },
    };

    await Deno.mkdir(context.outputDir, { recursive: true });
    await Deno.writeTextFile(jsonReportPath, JSON.stringify(reportData, null, 2));

    // 後方互換性のための簡易 HTML も生成
    const htmlContent = `<!DOCTYPE html><html><body><h1>Review: ${context.repository}#${context.number}</h1><p>Verdict: APPROVE</p></body></html>`;
    await Deno.writeTextFile(htmlReportPath, htmlContent);

    await log('[MockEngine] Generated review.json and report.html successfully.');

    const briefText = typeof reportData.summary.brief === 'string'
      ? reportData.summary.brief
      : (reportData.summary.brief.problem ?? reportData.summary.brief.approach ?? '');

    const ruleId = context.rule?.id ?? 'default';

    const ruleName = context.rule?.name ?? 'General Review';
    const category = context.rule?.category ?? 'general';

    const ruleResult = {
      ruleId,
      ruleName,
      category,
      headSha: context.headSha,
      verdict: 'PASS' as const,
      summary: briefText,
      findings: [
        {
          id: 'F1',
          ruleId,
          category,
          title: 'エクスポート構成の整理',
          path: 'packages/core/src/index.ts',
          line: 5,
          severity: 'LOW' as const,
          status: 'NEW' as const,
          body: '型定義とインターフェースのエクスポートが整然と維持されていることを確認しました。',
        },
      ],
    };

    return {
      success: true,
      summary: briefText,
      verdict: reportData.verdict,
      reportJsonPath: jsonReportPath,
      reportData,
      reportHtmlPath: htmlReportPath,
      ruleResult,
    };
  }
}

