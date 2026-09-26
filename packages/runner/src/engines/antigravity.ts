import type { EngineEnvironment, ReviewEngine, ReviewExecutionContext, ReviewExecutionResult } from '@kuramori/core';
import { executePreFlight, buildReviewPrompt, executePostFlight } from '../pipeline/runner-pipeline.ts';
import { resolveEngineEnvironment } from './environment.ts';

export interface AntigravityEngineOptions {
  agyBinaryPath?: string;
  timeoutMs?: number; // default: 15 minutes
  model?: string;
  effort?: string;
  systemPrompt?: string;
  printTimeout?: string;
  sandbox?: boolean;
  disableSlashCommands?: boolean;
  inputFormat?: 'text' | 'stream-json';
  outputFormat?: 'text' | 'json' | 'stream-json';
  jsonSchema?: string;
  customArgs?: string;
  customEnv?: EngineEnvironment;
}

export class AntigravityEngine implements ReviewEngine {
  readonly name = 'antigravity';
  private readonly agyBinaryPath: string;
  private readonly timeoutMs: number;
  private readonly model?: string;
  private readonly effort?: string;
  private readonly systemPrompt?: string;
  private readonly printTimeout?: string;
  private readonly sandbox?: boolean;
  private readonly disableSlashCommands?: boolean;
  private readonly inputFormat?: 'text' | 'stream-json';
  private readonly outputFormat?: 'text' | 'json' | 'stream-json';
  private readonly jsonSchema?: string;
  private readonly customArgs?: string;
  private readonly customEnv?: EngineEnvironment;

  constructor(options?: AntigravityEngineOptions) {
    this.agyBinaryPath = options?.agyBinaryPath ?? Deno.env.get('AGY_BIN') ?? 'agy';
    this.timeoutMs = options?.timeoutMs ?? 15 * 60 * 1000;
    this.model = options?.model;
    this.effort = options?.effort;
    this.systemPrompt = options?.systemPrompt;
    this.printTimeout = options?.printTimeout;
    this.sandbox = options?.sandbox;
    this.disableSlashCommands = options?.disableSlashCommands;
    this.inputFormat = options?.inputFormat;
    this.outputFormat = options?.outputFormat;
    this.jsonSchema = options?.jsonSchema;
    this.customArgs = options?.customArgs;
    this.customEnv = options?.customEnv;
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
      const prompt = await buildReviewPrompt(context, this.systemPrompt);

      // 3. Antigravity CLI 実行 (cmd.output で確実に終了検知)
      await log(`[Engine] Running agy command...`);
      const args = [
        '--new-project',
        '-p',
        prompt,
        '--dangerously-skip-permissions',
      ];

      if (this.model) {
        args.push('--model', this.model);
      }
      if (this.effort) {
        args.push('--effort', this.effort);
      }
      if (this.printTimeout?.trim()) {
        const val = this.printTimeout.trim();
        const formatted = /^\d+$/.test(val) ? `${val}s` : val;
        args.push('--print-timeout', formatted);
      }
      if (this.sandbox) {
        args.push('--sandbox');
      }
      if (this.disableSlashCommands) {
        args.push('--disable-slash-commands');
      }
      if (this.inputFormat && this.inputFormat !== 'text') {
        args.push('--input-format', this.inputFormat);
      }
      if (this.outputFormat && this.outputFormat !== 'text') {
        args.push('--output-format', this.outputFormat);
      }
      if (this.jsonSchema?.trim()) {
        args.push('--json-schema', this.jsonSchema.trim());
      }
      if (this.customArgs) {
        const extra = this.customArgs.split(/\s+/).filter(Boolean);
        args.push(...extra);
      }

      const cmd = new Deno.Command(this.agyBinaryPath, {
        args,
        cwd: context.worktreePath,
        stdin: 'null',
        stdout: 'piped',
        stderr: 'piped',
        env: resolveEngineEnvironment(Deno.env.toObject(), this.customEnv),
      });

      const child = cmd.spawn();

      // タイムアウト付きで output を実行
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          try {
            child.kill('SIGTERM');
            setTimeout(() => {
              try { child.kill('SIGKILL'); } catch { /* ignore */ }
            }, 5000);
          } catch {
            // ignore if already exited
          }
          reject(new Error(`Review execution timed out after ${this.timeoutMs / 1000}s`));
        }, this.timeoutMs);
      });

      const output = await Promise.race([child.output(), timeoutPromise]);
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
      let rawOutputText = stdout;
      if (this.outputFormat === 'json') {
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.structured_output) {
            rawOutputText = JSON.stringify(parsed.structured_output);
          } else if (typeof parsed.response === 'string') {
            rawOutputText = parsed.response;
          }
        } catch {
          // ignore parse error
        }
      }

      return await executePostFlight(context, log, rawOutputText);
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
