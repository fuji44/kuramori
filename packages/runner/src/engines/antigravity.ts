import type { ReviewEngine, ReviewExecutionContext, ReviewExecutionResult } from '@review-base/core';
import { executePreFlight, buildReviewPrompt, executePostFlight } from '../pipeline/runner-pipeline.ts';

export interface AntigravityEngineOptions {
  agyBinaryPath?: string;
  timeoutMs?: number; // default: 15 minutes
}

export class AntigravityEngine implements ReviewEngine {
  readonly name = 'antigravity';
  private readonly agyBinaryPath: string;
  private readonly timeoutMs: number;

  constructor(options?: AntigravityEngineOptions) {
    this.agyBinaryPath = options?.agyBinaryPath ?? Deno.env.get('AGY_BIN') ?? 'agy';
    this.timeoutMs = options?.timeoutMs ?? 15 * 60 * 1000;
  }

  async execute(context: ReviewExecutionContext): Promise<ReviewExecutionResult> {
    await Deno.mkdir(context.outputDir, { recursive: true });

    const log = async (message: string) => {
      const timestamp = new Date().toISOString();
      const line = `[${timestamp}] ${message}\n`;
      await Deno.writeTextFile(context.logPath, line, { append: true, create: true });
    };

    await log(`Starting review execution for ${context.repository}#${context.number} with engine 'antigravity'`);
    await log(`Using agy binary: ${this.agyBinaryPath}`);
    await log(`Target worktree: ${context.worktreePath}`);

    try {
      // 1. Pre-flight コンテキスト収集・配置
      await executePreFlight(context, log);

      // 2. プロンプト生成 (専用スキル + Zod 4 スキーマ)
      const prompt = await buildReviewPrompt(context);

      // 3. Antigravity CLI 実行 (cmd.output で確実に終了検知)
      await log(`[Engine] Running agy command...`);
      const cmd = new Deno.Command(this.agyBinaryPath, {
        args: [
          '--new-project',
          '-p',
          prompt,
          '--dangerously-skip-permissions',
        ],
        cwd: context.worktreePath,
        stdin: 'null',
        stdout: 'piped',
        stderr: 'piped',
        env: Deno.env.toObject(),
      });

      // タイムアウト付きで output を実行
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Review execution timed out after ${this.timeoutMs / 1000}s`));
        }, this.timeoutMs);
      });

      const output = await Promise.race([cmd.output(), timeoutPromise]);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      const stdout = new TextDecoder().decode(output.stdout);
      const stderr = new TextDecoder().decode(output.stderr);

      await log(`[Engine] agy finished with code ${output.code}`);
      if (stdout) {
        await log(`[STDOUT]\n${stdout}`);
      }
      if (stderr) {
        await log(`[STDERR]\n${stderr}`);
      }

      // 4. Post-flight: Gatekeeper による review.json 検収
      return await executePostFlight(context, log, stdout);
    } catch (err) {
      const errorMsg = `Review execution encountered an error: ${err}`;
      await log(`[FATAL] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
