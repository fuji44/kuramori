import type { ReviewEngine, ReviewExecutionContext, ReviewExecutionResult } from '@review-base/core';
import { executePreFlight, buildReviewPrompt, executePostFlight } from '../pipeline/runner-pipeline.ts';

export interface ClaudeCodeEngineOptions {
  claudeBinaryPath?: string;
  timeoutMs?: number; // default: 15 minutes
}

export class ClaudeCodeEngine implements ReviewEngine {
  readonly name = 'claude-code';
  private readonly claudeBinaryPath: string;
  private readonly timeoutMs: number;

  constructor(options?: ClaudeCodeEngineOptions) {
    this.claudeBinaryPath = options?.claudeBinaryPath ?? Deno.env.get('CLAUDE_BIN') ?? 'claude';
    this.timeoutMs = options?.timeoutMs ?? 15 * 60 * 1000;
  }

  async execute(context: ReviewExecutionContext): Promise<ReviewExecutionResult> {
    await Deno.mkdir(context.outputDir, { recursive: true });

    const log = async (message: string) => {
      const timestamp = new Date().toISOString();
      const line = `[${timestamp}] ${message}\n`;
      await Deno.writeTextFile(context.logPath, line, { append: true, create: true });
    };

    await log(`Starting review execution for ${context.repository}#${context.number} with engine 'claude-code'`);
    await log(`Using claude binary: ${this.claudeBinaryPath}`);
    await log(`Target worktree: ${context.worktreePath}`);

    try {
      // 1. Pre-flight コンテキスト収集・配置
      await executePreFlight(context, log);

      // 2. プロンプト生成 (専用スキル + Zod 4 スキーマ)
      const prompt = await buildReviewPrompt(context);

      // 3. Claude Code CLI 実行
      await log(`[Engine] Running claude command...`);
      const cmd = new Deno.Command(this.claudeBinaryPath, {
        args: [
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

      await log(`[Engine] claude finished with code ${output.code}`);
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
