import { join } from 'node:path';
import type { ReviewEngine, ReviewExecutionContext, ReviewExecutionResult } from '@review-base/core';

export class MockReviewEngine implements ReviewEngine {
  readonly name = 'mock';

  async execute(context: ReviewExecutionContext): Promise<ReviewExecutionResult> {
    const htmlReportPath = join(context.outputDir, 'report.html');
    const log = async (msg: string) => {
      const line = `[${new Date().toISOString()}] ${msg}\n`;
      await Deno.writeTextFile(context.logPath, line, { append: true, create: true });
    };

    await log(`[MockEngine] Starting mock review for ${context.repository}#${context.number}...`);
    await log(`[MockEngine] Scanning diff for head SHA: ${context.headSha}...`);

    // Simulated short processing delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>AI Review: ${context.repository}#${context.number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 2rem; line-height: 1.6; }
    h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; font-size: 0.875rem; background: #238636; color: white; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem 1.5rem; margin-top: 1rem; }
    .finding { border-left: 4px solid #58a6ff; padding-left: 1rem; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>🔍 AI レビューレポート: ${context.repository}#${context.number}</h1>
  <p><span class="badge">APPROVE</span> 規範チェック・変更差分検証 完了</p>
  <div class="card">
    <h3>概要</h3>
    <p>対象ブランチの変更点を確認しました。重大な設計上の問題、セキュリティ脆弱性、および規約違反は検出されませんでした。</p>
  </div>
  <div class="card">
    <h3>主な検証観点</h3>
    <div class="finding">
      <strong>✅ 規範チェック (C-2):</strong> コメント4類型（作業経緯・使われ方・将来計画・issue番号）の違反なし。
    </div>
    <div class="finding">
      <strong>✅ 型安全性:</strong> 不要な <code>as</code> アサーションはなく、<code>T | undefined</code> の明示的ガードを確認。
    </div>
  </div>
</body>
</html>`;

    await Deno.mkdir(context.outputDir, { recursive: true });
    await Deno.writeTextFile(htmlReportPath, htmlContent);

    await log('[MockEngine] Generated report.html successfully.');
    return {
      success: true,
      summary: 'AI レビュー完了（問題は検出されませんでした）',
      verdict: 'APPROVE',
      reportHtmlPath: htmlReportPath,
    };
  }
}
