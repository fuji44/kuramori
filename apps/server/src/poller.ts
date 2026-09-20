import { eq } from 'drizzle-orm';
import type { VCSProvider } from '@review-base/core';
import type { AppDatabase } from './db/index.ts';
import { reviewJobsTable, reviewRequestsTable } from './db/schema.ts';
import type { ReviewQueue } from './queue.ts';
import type { SettingsService } from './settings.ts';

export class GitHubPoller {
  private readonly vcsProvider: VCSProvider;
  private readonly db: AppDatabase;
  private readonly queue: ReviewQueue;
  private readonly settingsService?: SettingsService;
  private readonly intervalMs: number;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;

  constructor(
    vcsProvider: VCSProvider,
    db: AppDatabase,
    queue: ReviewQueue,
    settingsService?: SettingsService,
    intervalMs: number = 3 * 60 * 1000 // 3 minutes
  ) {
    this.vcsProvider = vcsProvider;
    this.db = db;
    this.queue = queue;
    this.settingsService = settingsService;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.timerId !== null) {
      return;
    }
    this.poll().catch((err) => {
      console.error('Initial poll failed', { err });
    });
    this.timerId = setInterval(() => {
      this.poll().catch((err) => {
        console.error('Scheduled poll failed', { err });
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  async poll(): Promise<void> {
    if (this.isPolling) {
      return;
    }
    this.isPolling = true;

    try {
      const prs = await this.vcsProvider.listReviewRequests();
      const autoQueue = this.settingsService
        ? await this.settingsService.isAutoQueueEnabled()
        : true;

      for (const pr of prs) {
        const existing = await this.db
          .select()
          .from(reviewRequestsTable)
          .where(eq(reviewRequestsTable.id, pr.id));

        if (existing.length === 0) {
          // New PR detected, insert
          await this.db.insert(reviewRequestsTable).values({
            id: pr.id,
            userId: pr.userId,
            provider: pr.provider,
            repository: pr.repository,
            number: pr.number,
            title: pr.title,
            author: pr.author,
            url: pr.url,
            sourceBranch: pr.sourceBranch,
            targetBranch: pr.targetBranch,
            headSha: pr.headSha,
            isDraft: pr.isDraft,
            state: pr.state,
            createdAt: pr.createdAt,
            updatedAt: pr.updatedAt,
          });

          if (autoQueue && !pr.isDraft) {
            await this.queue.enqueue(pr.id);
          }
        } else {
          // Update PR metadata
          await this.db
            .update(reviewRequestsTable)
            .set({
              title: pr.title,
              isDraft: pr.isDraft,
              state: pr.state,
              updatedAt: pr.updatedAt,
            })
            .where(eq(reviewRequestsTable.id, pr.id));

          // Check if it already has completed or pending review jobs
          const jobs = await this.db
            .select()
            .from(reviewJobsTable)
            .where(eq(reviewJobsTable.requestId, pr.id));

          const hasJob = jobs.some(
            (j) => j.status === 'completed' || j.status === 'running' || j.status === 'pending'
          );
          if (!hasJob && !pr.isDraft && autoQueue) {
            await this.queue.enqueue(pr.id);
          }
        }
      }
    } finally {
      this.isPolling = false;
    }
  }
}
