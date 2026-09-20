import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import type { AppDatabase } from './db/index.ts';
import { reviewJobsTable, reviewReportsTable, reviewRequestsTable } from './db/schema.ts';
import { WorktreeManager, ClaudeCodeEngine, AntigravityEngine, MockReviewEngine } from '@review-base/runner';
import type { ReportStorage, ReviewEngine, VCSProvider } from '@review-base/core';
import type { SettingsService } from './settings.ts';

export class ReviewQueue {
  private readonly db: AppDatabase;
  private readonly storage: ReportStorage;
  private readonly defaultEngine?: ReviewEngine;
  private readonly settingsService?: SettingsService;
  private readonly worktreeManager: WorktreeManager;
  private readonly vcsProvider?: VCSProvider;
  private readonly queue: string[] = []; // reviewRequest IDs
  private isProcessing = false;
  private readonly reportsDir: string;

  constructor(
    db: AppDatabase,
    storage: ReportStorage,
    options?: {
      engine?: ReviewEngine;
      settingsService?: SettingsService;
      cacheDir?: string;
      worktreeDir?: string;
      reportsDir?: string;
      vcsProvider?: VCSProvider;
    }
  ) {
    this.db = db;
    this.storage = storage;
    this.defaultEngine = options?.engine;
    this.settingsService = options?.settingsService;
    this.vcsProvider = options?.vcsProvider;
    this.reportsDir = options?.reportsDir ?? './data/reports';
    this.worktreeManager = new WorktreeManager(
      options?.cacheDir ?? './data/cache',
      options?.worktreeDir ?? './.worktrees'
    );
    this.recoverStaleJobs().catch((err) => {
      console.error('Failed to recover stale jobs on startup', { err });
    });
  }

  private async resolveEngine(): Promise<ReviewEngine> {
    if (this.defaultEngine) {
      return this.defaultEngine;
    }

    if (this.settingsService) {
      const settings = await this.settingsService.getAllSettings();
      if (settings.reviewEngine === 'mock') {
        return new MockReviewEngine();
      }
      if (settings.reviewEngine === 'claude-code') {
        return new ClaudeCodeEngine({ claudeBinaryPath: settings.claudeBin });
      }
      return new AntigravityEngine({ agyBinaryPath: settings.agyBin });
    }

    return new AntigravityEngine();
  }

  async recoverStaleJobs(): Promise<void> {
    const runningJobs = await this.db
      .select()
      .from(reviewJobsTable)
      .where(eq(reviewJobsTable.status, 'running'));

    const now = new Date().toISOString();
    for (const job of runningJobs) {
      await this.db
        .update(reviewJobsTable)
        .set({
          status: 'failed',
          completedAt: now,
          error: 'Interrupted by server restart',
        })
        .where(eq(reviewJobsTable.id, job.id));
    }
  }

  async enqueue(requestId: string): Promise<string> {
    const existing = await this.db
      .select()
      .from(reviewJobsTable)
      .where(eq(reviewJobsTable.requestId, requestId));

    const runningOrPending = existing.find(
      (j) => j.status === 'pending' || j.status === 'running'
    );
    if (runningOrPending) {
      return runningOrPending.id;
    }

    const engine = await this.resolveEngine();
    const jobId = crypto.randomUUID();
    await this.db.insert(reviewJobsTable).values({
      id: jobId,
      requestId,
      userId: 'default',
      status: 'pending',
      engine: engine.name,
      startedAt: null,
      completedAt: null,
      error: null,
      reportId: null,
    });

    this.queue.push(requestId);
    this.processNext().catch((err) => {
      console.error('Queue processing error', { err });
    });

    return jobId;
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const requestId = this.queue.shift();
    if (requestId === undefined) {
      this.isProcessing = false;
      return;
    }

    try {
      await this.runReview(requestId);
    } catch (err) {
      console.error('Failed to run review for request', { requestId, err });
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        this.processNext().catch((err) => {
          console.error('Queue processing error', { err });
        });
      }
    }
  }

  private async runReview(requestId: string): Promise<void> {
    const requests = await this.db
      .select()
      .from(reviewRequestsTable)
      .where(eq(reviewRequestsTable.id, requestId));

    let pr = requests[0];
    if (!pr) {
      console.error('Review request not found in database', { requestId });
      return;
    }

    // Refresh details if headSha is empty and vcsProvider is available
    if (!pr.headSha && this.vcsProvider) {
      try {
        const fresh = await this.vcsProvider.getReviewRequest(pr.repository, pr.number);
        if (fresh && fresh.headSha) {
          await this.db
            .update(reviewRequestsTable)
            .set({
              headSha: fresh.headSha,
              sourceBranch: fresh.sourceBranch,
              targetBranch: fresh.targetBranch,
            })
            .where(eq(reviewRequestsTable.id, requestId));
          pr = { ...pr, headSha: fresh.headSha, sourceBranch: fresh.sourceBranch, targetBranch: fresh.targetBranch };
        }
      } catch (err) {
        console.error('Failed to fetch fresh PR details', { requestId, err });
      }
    }

    const jobs = await this.db
      .select()
      .from(reviewJobsTable)
      .where(eq(reviewJobsTable.requestId, requestId));

    const pendingJob = jobs.find((j) => j.status === 'pending');
    const jobId = pendingJob?.id ?? crypto.randomUUID();

    const now = new Date().toISOString();
    await this.db
      .update(reviewJobsTable)
      .set({
        status: 'running',
        startedAt: now,
      })
      .where(eq(reviewJobsTable.id, jobId));

    const outputDir = join(this.reportsDir, `${pr.repository.replace('/', '__')}_${pr.number}`);
    const logsDir = join(this.reportsDir, '..', 'logs');
    const logPath = join(logsDir, `${jobId}.log`);
    await Deno.mkdir(outputDir, { recursive: true });
    await Deno.mkdir(logsDir, { recursive: true });

    let worktreeSession;
    try {
      worktreeSession = await this.worktreeManager.prepareWorktree(
        pr.repository,
        pr.number,
        pr.headSha
      );

      const engine = await this.resolveEngine();
      const result = await engine.execute({
        jobId,
        requestId,
        repository: pr.repository,
        number: pr.number,
        headSha: pr.headSha,
        worktreePath: worktreeSession.worktreePath,
        outputDir,
        logPath,
      });

      const completedAt = new Date().toISOString();
      if (result.success && result.reportHtmlPath) {
        const reportId = `${pr.repository.replace('/', '__')}_${pr.number}_${Date.now()}`;
        const htmlContent = await Deno.readTextFile(result.reportHtmlPath);
        await this.storage.saveReport(reportId, htmlContent);

        await this.db.insert(reviewReportsTable).values({
          id: reportId,
          jobId,
          requestId,
          userId: 'default',
          summary: result.summary ?? 'AI review completed successfully',
          verdict: result.verdict ?? 'COMMENT',
          createdAt: completedAt,
        });

        await this.db
          .update(reviewJobsTable)
          .set({
            status: 'completed',
            completedAt,
            reportId,
          })
          .where(eq(reviewJobsTable.id, jobId));
      } else {
        await this.db
          .update(reviewJobsTable)
          .set({
            status: 'failed',
            completedAt,
            error: result.error ?? 'Unknown review failure',
          })
          .where(eq(reviewJobsTable.id, jobId));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.db
        .update(reviewJobsTable)
        .set({
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: errorMessage,
        })
        .where(eq(reviewJobsTable.id, jobId));
    } finally {
      if (worktreeSession) {
        await worktreeSession.cleanup();
      }
    }
  }
}
