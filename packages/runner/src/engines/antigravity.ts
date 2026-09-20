import { join } from 'node:path';
import type { ReviewEngine, ReviewExecutionContext, ReviewExecutionResult } from '@review-base/core';

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
    const rawOutputDir = join(context.outputDir, 'raw');
    const findingsPath = join(context.outputDir, 'findings.json');
    const resultPath = join(context.outputDir, 'result.json');
    const htmlReportPath = join(context.outputDir, 'report.html');

    await Deno.mkdir(rawOutputDir, { recursive: true });

    const log = async (message: string) => {
      const timestamp = new Date().toISOString();
      const line = `[${timestamp}] ${message}\n`;
      await Deno.writeTextFile(context.logPath, line, { append: true, create: true });
    };

    await log(`Starting review execution for ${context.repository}#${context.number} with engine 'antigravity'`);
    await log(`Using agy binary: ${this.agyBinaryPath}`);
    await log(`Target worktree: ${context.worktreePath}`);

    const prompt = `
You are running automated PR review autopilot.
Follow the instructions in the fuji44-pr-review-autopilot skill and fuji44-pr-review-synthesis skill.

Inputs:
- Repository: ${context.repository}
- PR Number: ${context.number}
- Head SHA: ${context.headSha}
- Mode: autopilot
- Findings Output Path: ${findingsPath}
- Raw Output Directory: ${rawOutputDir}
- Result Output Path: ${resultPath}
- Final HTML Report Path: ${htmlReportPath}

Execute the autopilot review without modifying git or posting to GitHub.
Synthesize findings and output the final review HTML report to ${htmlReportPath}.
`;

    try {
      const cmd = new Deno.Command(this.agyBinaryPath, {
        args: [
          '-p',
          prompt,
          '--dangerously-skip-permissions',
        ],
        cwd: context.worktreePath,
        stdout: 'piped',
        stderr: 'piped',
      });

      const process = cmd.spawn();

      let isTimedOut = false;
      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        try {
          process.kill('SIGTERM');
        } catch {
          // ignore kill error
        }
      }, this.timeoutMs);

      const output = await process.output();
      clearTimeout(timeoutId);

      const stdout = new TextDecoder().decode(output.stdout);
      const stderr = new TextDecoder().decode(output.stderr);

      if (stdout) {
        await log(`[STDOUT]\n${stdout}`);
      }
      if (stderr) {
        await log(`[STDERR]\n${stderr}`);
      }

      if (isTimedOut) {
        const errorMsg = `Review execution timed out after ${this.timeoutMs / 1000}s`;
        await log(`[ERROR] ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }

      let htmlExists = false;
      try {
        const stat = await Deno.stat(htmlReportPath);
        htmlExists = stat.isFile;
      } catch {
        htmlExists = false;
      }

      if (!htmlExists) {
        const errorMsg = `Review report was not generated. Exit code: ${output.code}`;
        await log(`[ERROR] ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }

      await log('Review completed successfully. HTML report generated.');
      return {
        success: true,
        reportHtmlPath: htmlReportPath,
        rawFindingsPath: findingsPath,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      let userFriendlyError = errorMessage;

      if (errorMessage.includes('entity not found') || errorMessage.includes('No such file or directory')) {
        userFriendlyError = `Antigravity binary '${this.agyBinaryPath}' was not found in PATH. Please ensure 'agy' CLI is installed or set AGY_BIN path in Settings.`;
      }

      await log(`[FATAL] ${userFriendlyError}`);
      return {
        success: false,
        error: userFriendlyError,
      };
    }
  }
}
