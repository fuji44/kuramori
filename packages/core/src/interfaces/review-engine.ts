import type { ReviewVerdict } from '../types/review.ts';
import type { ReviewReportData } from '../schema/review-report.ts';

export interface ReviewExecutionContext {
  jobId: string;
  requestId: string;
  repository: string;
  number: number;
  headSha: string;
  worktreePath: string;
  outputDir: string;
  logPath: string;
}

export interface ReviewExecutionResult {
  success: boolean;
  summary?: string;
  verdict?: ReviewVerdict;
  reportJsonPath?: string;
  reportData?: ReviewReportData;
  reportHtmlPath?: string;
  rawFindingsPath?: string;
  error?: string;
}

export interface ReviewEngine {
  readonly name: string;
  execute(context: ReviewExecutionContext): Promise<ReviewExecutionResult>;
}
