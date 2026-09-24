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
      const settings = this.settingsService
        ? await this.settingsService.getAllSettings()
        : null;
      const autoQueue = settings?.autoQueue ?? true;
      const autoQueueIncludeOwn = settings?.autoQueueIncludeOwn ?? false;

      for (const pr of prs) {
        const isOwn = pr.isOwn ?? false;
        const isEligibleForAutoReview = autoQueue && !pr.isDraft && (!isOwn || autoQueueIncludeOwn);

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
            additions: pr.additions ?? null,
            deletions: pr.deletions ?? null,
            isDraft: pr.isDraft,
            isOwn,
            state: pr.state,
            createdAt: pr.createdAt,
            updatedAt: pr.updatedAt,
            labels: pr.labels ? JSON.stringify(pr.labels) : null,
            milestone: pr.milestone ?? null,
            assignees: pr.assignees ? JSON.stringify(pr.assignees) : null,
          });

          if (isEligibleForAutoReview) {
            await this.queue.enqueue(pr.id);
          }
        } else {
          // Update PR metadata
          await this.db
            .update(reviewRequestsTable)
            .set({
              title: pr.title,
              sourceBranch: pr.sourceBranch || undefined,
              targetBranch: pr.targetBranch || undefined,
              headSha: pr.headSha || undefined,
              additions: pr.additions,
              deletions: pr.deletions,
              isDraft: pr.isDraft,
              isOwn,
              state: pr.state,
              updatedAt: pr.updatedAt,
              labels: pr.labels ? JSON.stringify(pr.labels) : null,
              milestone: pr.milestone ?? null,
              assignees: pr.assignees ? JSON.stringify(pr.assignees) : null,
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
          if (!hasJob && isEligibleForAutoReview) {
            await this.queue.enqueue(pr.id);
          }
        }
      }

      // Check for PRs in DB that are marked open but no longer returned in active open PRs
      const activePrIds = new Set(prs.map((p) => p.id));
      const dbOpenPrs = await this.db
        .select()
        .from(reviewRequestsTable)
        .where(eq(reviewRequestsTable.state, 'open'));

      for (const openPr of dbOpenPrs) {
        if (!activePrIds.has(openPr.id)) {
          try {
            const latest = await this.vcsProvider.getReviewRequest(openPr.repository, openPr.number);
            if (latest && latest.state !== 'open') {
              await this.db
                .update(reviewRequestsTable)
                .set({
                  state: latest.state,
                  updatedAt: latest.updatedAt,
                })
                .where(eq(reviewRequestsTable.id, openPr.id));
            }
          } catch {
            // Ignore error checking individual PR
          }
        }
      }
    } finally {
      this.isPolling = false;
    }
  }
}
