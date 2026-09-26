import { join, resolve } from 'node:path';
import type {
  CodexSandboxMode,
  EngineEnvironment,
  ReviewEngine,
  ReviewExecutionContext,
  ReviewExecutionResult,
} from '@kuramori/core';
import { getReviewReportJsonSchema } from '@kuramori/core';
import { executePreFlight, buildReviewPrompt, executePostFlight } from '../pipeline/runner-pipeline.ts';
import { resolveEngineEnvironment } from './environment.ts';
import { prepareCodexOutputSchema } from './codex-schema.ts';

export interface CodexEngineOptions {
  codexBinaryPath?: string;
  timeoutMs?: number;
  model?: string;
  effort?: string;
  systemPrompt?: string;
  sandboxMode?: CodexSandboxMode;
  ephemeral?: boolean;
  customArgs?: string;
  customEnv?: EngineEnvironment;
}

export class CodexEngine implements ReviewEngine {
  readonly name = 'codex';
  private readonly codexBinaryPath: string;
  private readonly timeoutMs: number;
  private readonly model?: string;
  private readonly effort?: string;
  private readonly systemPrompt?: string;
  private readonly sandboxMode: CodexSandboxMode;
  private readonly ephemeral: boolean;
  private readonly customArgs?: string;
  private readonly customEnv?: EngineEnvironment;

  constructor(options?: CodexEngineOptions) {
    this.codexBinaryPath = options?.codexBinaryPath ?? Deno.env.get('CODEX_BIN') ?? 'codex';
    this.timeoutMs = options?.timeoutMs ?? 15 * 60 * 1000;
    this.model = options?.model;
    this.effort = options?.effort;
    this.systemPrompt = options?.systemPrompt;
    this.sandboxMode = options?.sandboxMode ?? 'workspace-write';
    this.ephemeral = options?.ephemeral ?? true;
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

    await log(`Starting review execution for ${context.repository}#${context.number} with engine 'codex'`);
    await log(`Using codex binary: ${this.codexBinaryPath}`);
    await log(`Target worktree: ${context.worktreePath}`);

    try {
      const customArgs = this.customArgs?.split(/\s+/).filter(Boolean) ?? [];
      if (customArgs.some((arg) => arg.startsWith('--dangerously-bypass-approvals-and-sandbox') || arg === '--yolo')) {
        throw new Error('Codex custom arguments cannot bypass approvals and sandboxing');
      }

      await executePreFlight(context, log);
      const outputSchema = prepareCodexOutputSchema(getReviewReportJsonSchema());
      const prompt = await buildReviewPrompt(context, this.systemPrompt, outputSchema.schema);
      const schemaPath = resolve(context.outputDir, 'codex-review-schema.json');
      const finalMessagePath = resolve(context.outputDir, 'codex-final-message.txt');
      await Deno.writeTextFile(schemaPath, JSON.stringify(outputSchema.schema));

      const args = [
        'exec',
        ...customArgs,
        '--json',
        '--cd',
        context.worktreePath,
        '--sandbox',
        this.sandboxMode,
        '--output-schema',
        schemaPath,
        '--output-last-message',
        finalMessagePath,
        '--config',
        'approval_policy="never"',
      ];

      if (this.ephemeral) {
        args.push('--ephemeral');
      }
      if (this.model) {
        args.push('--model', this.model);
      }
      if (this.effort) {
        args.push('--config', `model_reasoning_effort=${JSON.stringify(this.effort)}`);
      }
      args.push('-');

      await log('[Engine] Running codex exec...');
      const child = new Deno.Command(this.codexBinaryPath, {
        args,
        cwd: context.worktreePath,
        stdin: 'piped',
        stdout: 'piped',
        stderr: 'piped',
        env: resolveEngineEnvironment(Deno.env.toObject(), this.customEnv),
      }).spawn();

      const stdin = child.stdin;
      if (stdin === null) {
        throw new Error('Codex stdin is unavailable');
      }
      const writer = stdin.getWriter();
      await writer.write(new TextEncoder().encode(prompt));
      await writer.close();

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          try {
            child.kill('SIGTERM');
            setTimeout(() => {
              try { child.kill('SIGKILL'); } catch { /* ignore */ }
            }, 5000);
          } catch {
            // ignore if the process has already exited
          }
          reject(new Error(`Review execution timed out after ${this.timeoutMs / 1000}s`));
        }, this.timeoutMs);
      });

      const output = await Promise.race([child.output(), timeoutPromise]);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      const stdout = new TextDecoder().decode(output.stdout);
      const stderr = new TextDecoder().decode(output.stderr).trim();
      const events = stdout.split('\n').flatMap((line) => {
        try {
          const event = JSON.parse(line);
          return typeof event === 'object' && event !== null ? [event] : [];
        } catch {
          return [];
        }
      });
      const eventTypes = events.flatMap((event) =>
        typeof event.type === 'string' ? [event.type] : []
      );
      await log(`[Engine] codex finished with code ${output.code}; JSONL events: ${eventTypes.length}`);

      if (!output.success) {
        const eventErrors = events.flatMap((event) => {
          if (event.type !== 'error' && event.type !== 'turn.failed') {
            return [];
          }
          const error = event.error;
          if (typeof error === 'string') {
            return [error];
          }
          if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
            return [error.message];
          }
          return typeof event.message === 'string' ? [event.message] : [];
        });
        const error = stderr || eventErrors.join('\n') || `Codex CLI exited with status ${output.code}`;
        return {
          success: false,
          error,
        };
      }

      const finalMessage = await Deno.readTextFile(finalMessagePath);
      let normalizedFinalMessage = finalMessage;
      try {
        const parsed = JSON.parse(finalMessage);
        normalizedFinalMessage = JSON.stringify(outputSchema.normalizeOutput(parsed));
      } catch {
        // Let post-flight report invalid JSON using its normal error path.
      }
      return await executePostFlight(context, log, normalizedFinalMessage);
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
