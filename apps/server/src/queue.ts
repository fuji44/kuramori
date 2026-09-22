import { eq, or, and } from 'drizzle-orm';
import { join } from 'node:path';
import type { AppDatabase } from './db/index.ts';
import {
  reviewJobsTable,
  reviewRequestsTable,
  reviewRulesTable,
  reviewRuleResultsTable,
} from './db/schema.ts';
import {
  WorktreeManager,
  ClaudeCodeEngine,
  AntigravityEngine,
  MockReviewEngine,
  extractChangedFilesFromDiff,
  matchRuleTrigger,
} from '@review-base/runner';
import {
  type ReportStorage,
  type ReviewEngine,
  type VCSProvider,
  type ReviewRule,
  type RuleResultFinding,
  resolveEngineConfig,
} from '@review-base/core';
import type { SettingsService, AppSettings } from './settings.ts';
import { aggregateRuleResults } from './aggregator.ts';

const DEFAULT_APP_SETTINGS: AppSettings = {
  autoQueue: false,
  autoQueueIncludeOwn: false,
  reviewEngine: 'antigravity',
  agyBin: 'agy',
  claudeBin: 'claude',
  defaultRuleIds: ['preset-correctness'],
  defaultRuleId: 'preset-correctness',
  defaultBackendId: 'antigravity',
  globalMaxConcurrency: 2,
  backendMaxConcurrency: { antigravity: 2, claudeCode: 1, mock: 5 },
  engineSettings: {
    antigravity: {
      binPath: 'agy',
      model: 'gemini-3.1-pro',
      effort: 'high',
      timeoutSeconds: 900,
      printTimeout: '',
      sandbox: false,
      disableSlashCommands: false,
      inputFormat: 'text',
      outputFormat: 'text',
      jsonSchema: '',
      customArgs: '',
    },
    claudeCode: {
      binPath: 'claude',
      model: 'sonnet',
      effort: 'high',
      timeoutSeconds: 900,
      allowedTools: '',
      bare: false,
      inputFormat: 'text',
      outputFormat: 'text',
      jsonSchema: '',
      customArgs: '',
    },
    mock: {
      delayMs: 500,
    },
  },
};

export interface ReviewQueueOptions {
  reportsDir?: string;
  cacheDir?: string;
  worktreeDir?: string;
  vcsProvider?: VCSProvider;
  defaultEngine?: ReviewEngine;
  settingsService?: SettingsService;
}

export class ReviewQueue {
  private readonly db: AppDatabase;
  private readonly storage: ReportStorage;
  private readonly worktreeManager: WorktreeManager;
  private readonly reportsDir: string;
  private readonly vcsProvider?: VCSProvider;
  private readonly defaultEngine?: ReviewEngine;
  private readonly settingsService?: SettingsService;
  private readonly jobQueue: string[] = []; // reviewJob IDs
  private readonly runningJobIds = new Set<string>();
  private isProcessing = false;

  constructor(
    db: AppDatabase,
    storage: ReportStorage,
    options?: ReviewQueueOptions
  ) {
    this.db = db;
    this.storage = storage;
    this.vcsProvider = options?.vcsProvider;
    this.defaultEngine = options?.defaultEngine;
    this.settingsService = options?.settingsService;
    this.reportsDir = options?.reportsDir ?? './data/reports';
    this.worktreeManager = new WorktreeManager(
      options?.cacheDir ?? './data/cache',
      options?.worktreeDir ?? './.worktrees'
    );
    this.recoverStaleJobs().catch((err) => {
      console.error('Failed to recover stale jobs on startup', { error: String(err) });
    });
  }

  private resolveEngineInstance(
    engineName: string,
    settings: AppSettings,
    rule?: ReviewRule
  ): ReviewEngine {
    if (this.defaultEngine) {
      return this.defaultEngine;
    }

    if (engineName === 'mock') {
      return new MockReviewEngine({ delayMs: settings.engineSettings?.mock?.delayMs });
    }
    if (engineName === 'claude-code') {
      const baseCfg = settings.engineSettings?.claudeCode ?? {
        binPath: settings.claudeBin,
        model: 'sonnet',
        effort: 'high',
        timeoutSeconds: 900,
        systemPrompt: '',
        allowedTools: '',
        bare: false,
        inputFormat: 'text',
        outputFormat: 'text',
        jsonSchema: '',
        customArgs: '',
      };
      const cfg = resolveEngineConfig(baseCfg, rule?.engineOverride);
      return new ClaudeCodeEngine({
        claudeBinaryPath: cfg.binPath || settings.claudeBin,
        model: cfg.model,
        effort: cfg.effort,
        timeoutMs: (cfg.timeoutSeconds ?? 900) * 1000,
        systemPrompt: cfg.systemPrompt,
        allowedTools: cfg.allowedTools,
        bare: cfg.bare,
        inputFormat: cfg.inputFormat,
        outputFormat: cfg.outputFormat,
        jsonSchema: cfg.jsonSchema,
        customArgs: cfg.customArgs,
      });
    }
    // default: antigravity
    const baseCfg = settings.engineSettings?.antigravity ?? {
      binPath: settings.agyBin,
      model: 'gemini-3.1-pro',
      effort: 'high',
      timeoutSeconds: 900,
      systemPrompt: '',
      printTimeout: '',
      sandbox: false,
      disableSlashCommands: false,
      inputFormat: 'text',
      outputFormat: 'text',
      jsonSchema: '',
      customArgs: '',
    };
    const cfg = resolveEngineConfig(baseCfg, rule?.engineOverride);
    return new AntigravityEngine({
      agyBinaryPath: cfg.binPath || settings.agyBin,
      model: cfg.model,
      effort: cfg.effort,
      timeoutMs: (cfg.timeoutSeconds ?? 900) * 1000,
      systemPrompt: cfg.systemPrompt,
      printTimeout: cfg.printTimeout,
      sandbox: cfg.sandbox,
      disableSlashCommands: cfg.disableSlashCommands,
      inputFormat: cfg.inputFormat,
      outputFormat: cfg.outputFormat,
      jsonSchema: cfg.jsonSchema,
      customArgs: cfg.customArgs,
    });
  }

  async recoverStaleJobs(): Promise<void> {
    const staleJobs = await this.db
      .select()
      .from(reviewJobsTable)
      .where(or(eq(reviewJobsTable.status, 'running'), eq(reviewJobsTable.status, 'pending')));

    const now = new Date().toISOString();
    for (const job of staleJobs) {
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

  /**
   * PR と対象ルールを指定してレビューキューに追加する
   */
  async enqueue(requestId: string, ruleIdsParam?: string | string[]): Promise<string> {
    const jobIds = await this.enqueueRules(requestId, ruleIdsParam);
    return jobIds.length > 0 ? jobIds[0] : '';
  }

  async enqueueRules(requestId: string, ruleIdsParam?: string | string[]): Promise<string[]> {
    const requests = await this.db
      .select()
      .from(reviewRequestsTable)
      .where(eq(reviewRequestsTable.id, requestId));

    let pr = requests[0];
    if (!pr) {
      console.error('Review request not found in database', { requestId });
      return [];
    }

    // headSha が最新でない場合は VCS から取得
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
        console.error('Failed to fetch fresh PR details', { requestId, error: String(err) });
      }
    }

    const settings = this.settingsService
      ? await this.settingsService.getAllSettings()
      : DEFAULT_APP_SETTINGS;

    // 全ルールレコードを取得
    const ruleRecords = await this.db.select().from(reviewRulesTable);
    const rules: ReviewRule[] = ruleRecords.map((r) => {
      let trigger = {};
      try {
        trigger = JSON.parse(r.triggerJson);
      } catch {
        // ignore
      }
      let engineOverride = undefined;
      if (r.engineOverrideJson) {
        try {
          engineOverride = JSON.parse(r.engineOverrideJson);
        } catch {
          // ignore
        }
      }
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        engine: r.engine,
        instructions: r.instructions,
        engineOverride,
        trigger,
        enabled: Boolean(r.enabled),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    let targetRules: ReviewRule[] = [];

    if (ruleIdsParam) {
      const ids = Array.isArray(ruleIdsParam) ? ruleIdsParam : [ruleIdsParam];
      targetRules = rules.filter((r) => ids.includes(r.id));
    } else {
      // 自動選定: PR Pre-flight 評価
      let changedFiles: string[] = [];
      if (this.vcsProvider) {
        try {
          const diffText = await this.vcsProvider.getDiff(pr.repository, pr.number);
          changedFiles = Array.from(extractChangedFilesFromDiff(diffText));
        } catch {
          // ignore
        }
      }

      let parsedLabels: string[] = [];
      if (pr.labels) {
        try {
          const lbls = JSON.parse(pr.labels);
          if (Array.isArray(lbls)) {
            parsedLabels = lbls.map((l: { name?: string }) => l.name || '');
          }
        } catch {
          // ignore
        }
      }

      const event = {
        eventType: 'synchronize' as const,
        changedFiles,
        isDraft: Boolean(pr.isDraft),
        labels: parsedLabels,
      };

      targetRules = rules.filter((r) => r.enabled && matchRuleTrigger(r, event));

      // マッチするルールがない場合は defaultRuleIds を使用
      if (targetRules.length === 0) {
        const fallbackIds = (settings.defaultRuleIds && settings.defaultRuleIds.length > 0)
          ? settings.defaultRuleIds
          : (settings.defaultRuleId ? [settings.defaultRuleId] : ['preset-correctness']);
        targetRules = rules.filter((r) => fallbackIds.includes(r.id));
      }
    }

    if (targetRules.length === 0) {
      return [];
    }

    // 既存のアクティブジョブを確認して重複を防ぐ
    const existingJobs = await this.db
      .select()
      .from(reviewJobsTable)
      .where(eq(reviewJobsTable.requestId, requestId));

    const createdJobIds: string[] = [];

    for (const rule of targetRules) {
      const activeJob = existingJobs.find(
        (j) =>
          j.ruleId === rule.id &&
          j.headSha === pr.headSha &&
          (j.status === 'pending' || j.status === 'running')
      );

      if (activeJob) {
        createdJobIds.push(activeJob.id);
        continue;
      }

      // ルールの engine 解決 ('default' の場合は settings.defaultBackendId)
      let resolvedEngine = rule.engine;
      if (!resolvedEngine || resolvedEngine === 'default') {
        resolvedEngine = settings.defaultBackendId || settings.reviewEngine || 'antigravity';
      }

      const jobId = crypto.randomUUID();
      await this.db.insert(reviewJobsTable).values({
        id: jobId,
        requestId,
        userId: 'default',
        status: 'pending',
        engine: resolvedEngine,
        startedAt: null,
        completedAt: null,
        error: null,
        reportId: null,
        ruleId: rule.id,
        ruleName: rule.name,
        ruleCategory: rule.category,
        headSha: pr.headSha,
      });

      this.jobQueue.push(jobId);
      createdJobIds.push(jobId);
    }

    this.processQueue();
    return createdJobIds;
  }

  private processQueue(): void {
    Promise.resolve().then(async () => {
      if (this.jobQueue.length === 0) {
        return;
      }

      const settings = this.settingsService
        ? await this.settingsService.getAllSettings()
        : {
            globalMaxConcurrency: 2,
            backendMaxConcurrency: { antigravity: 2, claudeCode: 1, mock: 5 },
          };

      const globalLimit = settings.globalMaxConcurrency ?? 2;
      const backendLimits = settings.backendMaxConcurrency ?? {
        antigravity: 2,
        claudeCode: 1,
        mock: 5,
      };

      while (this.jobQueue.length > 0 && this.runningJobIds.size < globalLimit) {
        // 現在走っている各エンジンの数を集約
        const runningJobs = await this.db
          .select()
          .from(reviewJobsTable)
          .where(eq(reviewJobsTable.status, 'running'));

        const runningEngineCount: Record<string, number> = {
          antigravity: 0,
          'claude-code': 0,
          mock: 0,
        };
        for (const j of runningJobs) {
          const eng = j.engine || 'antigravity';
          runningEngineCount[eng] = (runningEngineCount[eng] ?? 0) + 1;
        }

        // キューの中で、エンジン枠が空いているジョブを探索
        let candidateIndex = -1;
        for (let i = 0; i < this.jobQueue.length; i++) {
          const jId = this.jobQueue[i];
          const jobRecord = (
            await this.db.select().from(reviewJobsTable).where(eq(reviewJobsTable.id, jId))
          )[0];

          if (!jobRecord) {
            continue;
          }

          const engine = jobRecord.engine;
          let limit = 2;
          if (engine === 'antigravity') limit = backendLimits.antigravity;
          else if (engine === 'claude-code') limit = backendLimits.claudeCode;
          else if (engine === 'mock') limit = backendLimits.mock;

          const currentRunning = runningEngineCount[engine] ?? 0;
          if (currentRunning < limit) {
            candidateIndex = i;
            break;
          }
        }

        if (candidateIndex === -1) {
          // 実行可能枠がないため待機
          break;
        }

        const [jobId] = this.jobQueue.splice(candidateIndex, 1);
        this.runningJobIds.add(jobId);

        this.runJob(jobId)
          .catch((err) => {
            console.error('Job execution error', { jobId, error: String(err) });
          })
          .finally(() => {
            this.runningJobIds.delete(jobId);
            this.processQueue();
          });
      }
    });
  }

  private async runJob(jobId: string): Promise<void> {
    const jobRecords = await this.db
      .select()
      .from(reviewJobsTable)
      .where(eq(reviewJobsTable.id, jobId));
    const job = jobRecords[0];
    if (!job) {
      return;
    }

    const requests = await this.db
      .select()
      .from(reviewRequestsTable)
      .where(eq(reviewRequestsTable.id, job.requestId));
    const pr = requests[0];
    if (!pr) {
      console.error('PR not found for job', { jobId, requestId: job.requestId });
      return;
    }

    const now = new Date().toISOString();
    await this.db
      .update(reviewJobsTable)
      .set({
        status: 'running',
        startedAt: now,
      })
      .where(eq(reviewJobsTable.id, jobId));

    const settings = this.settingsService
      ? await this.settingsService.getAllSettings()
      : DEFAULT_APP_SETTINGS;

    const outputDir = join(
      this.reportsDir,
      `${pr.repository.replace('/', '__')}_${pr.number}_${job.ruleId ?? 'default'}`
    );
    const logsDir = join(this.reportsDir, '..', 'logs');
    const logPath = join(logsDir, `${jobId}.log`);
    await Deno.mkdir(outputDir, { recursive: true });
    await Deno.mkdir(logsDir, { recursive: true });

    let worktreeSession;
    try {
      worktreeSession = await this.worktreeManager.prepareWorktree(
        pr.repository,
        pr.number,
        job.headSha || pr.headSha
      );

      // ルール情報の取得
      let rule: ReviewRule | undefined;
      if (job.ruleId) {
        const ruleRecords = await this.db
          .select()
          .from(reviewRulesTable)
          .where(eq(reviewRulesTable.id, job.ruleId));
        const r = ruleRecords[0];
        if (r) {
          let trigger = {};
          try {
            trigger = JSON.parse(r.triggerJson);
          } catch {
            // ignore
          }
          let engineOverride = undefined;
          if (r.engineOverrideJson) {
            try {
              engineOverride = JSON.parse(r.engineOverrideJson);
            } catch {
              // ignore
            }
          }
          rule = {
            id: r.id,
            name: r.name,
            description: r.description,
            category: r.category,
            engine: r.engine,
            instructions: r.instructions,
            engineOverride,
            trigger,
            enabled: Boolean(r.enabled),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          };
        }
      }

      // 過去の指摘 (Previous Findings) の取得
      let previousFindings: RuleResultFinding[] = [];
      if (job.ruleId) {
        const pastResults = await this.db
          .select()
          .from(reviewRuleResultsTable)
          .where(
            and(
              eq(reviewRuleResultsTable.requestId, pr.id),
              eq(reviewRuleResultsTable.ruleId, job.ruleId)
            )
          );
        // 最新のものを取得
        const latestPast = pastResults.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (latestPast) {
          try {
            previousFindings = JSON.parse(latestPast.findings);
          } catch {
            // ignore
          }
        }
      }

      const engineInstance = this.resolveEngineInstance(job.engine, settings, rule);

      const result = await engineInstance.execute({
        jobId,
        requestId: pr.id,
        repository: pr.repository,
        number: pr.number,
        headSha: job.headSha || pr.headSha,
        worktreePath: worktreeSession.worktreePath,
        outputDir,
        logPath,
        rule,
        previousFindings,
      });

      const completedAt = new Date().toISOString();

      if (result.success) {
        // RuleResult の永続化
        if (result.ruleResult && job.ruleId) {
          await this.db.insert(reviewRuleResultsTable).values({
            id: crypto.randomUUID(),
            jobId,
            requestId: pr.id,
            ruleId: job.ruleId,
            ruleName: job.ruleName || rule?.name || 'General Review',
            category: job.ruleCategory || rule?.category || 'general',
            headSha: job.headSha || pr.headSha,
            verdict: result.ruleResult.verdict,
            summary: result.ruleResult.summary,
            findings: JSON.stringify(result.ruleResult.findings),
            metadata: result.ruleResult.metadata ? JSON.stringify(result.ruleResult.metadata) : null,
            createdAt: completedAt,
          });
        }

        await this.db
          .update(reviewJobsTable)
          .set({
            status: 'completed',
            completedAt,
          })
          .where(eq(reviewJobsTable.id, jobId));

        // 静穏状態判定 (Quiescence Check): 同一 PR かつ同一 headSha のアクティブジョブ数を検査
        const activeJobs = await this.db
          .select()
          .from(reviewJobsTable)
          .where(
            and(
              eq(reviewJobsTable.requestId, pr.id),
              eq(reviewJobsTable.headSha, job.headSha || pr.headSha),
              or(eq(reviewJobsTable.status, 'pending'), eq(reviewJobsTable.status, 'running'))
            )
          );

        // 自分以外の実行中/保留ジョブが 0 の静穏状態であれば集約を実行
        if (activeJobs.length === 0) {
          await aggregateRuleResults(this.db, this.storage, {
            requestId: pr.id,
            headSha: job.headSha || pr.headSha,
            jobId,
          });
        }
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
