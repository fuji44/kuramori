import { eq, or, and } from 'drizzle-orm';
import { join, resolve } from '@std/path';
import type { AppDatabase } from './db/index.ts';
import {
  reviewJobsTable,
  reviewRequestsTable,
  reviewRulesTable,
  reviewRuleResultsTable,
  reviewTriggersTable,
} from './db/schema.ts';
import {
  WorktreeManager,
  ClaudeCodeEngine,
  AntigravityEngine,
  CodexEngine,
  MockReviewEngine,
  extractChangedFilesFromDiff,
  matchRuleTrigger,
  evaluateTriggersForRules,
  resolveEngineEnvironment,
} from '@kuramori/runner';
import {
  type ReportStorage,
  type ReviewEngine,
  type VCSProvider,
  type ReviewRule,
  type ReviewTrigger,
  type RuleResultFinding,
  resolveRuleEngineProfile,
} from '@kuramori/core';
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
  enabledEngines: ['antigravity', 'claude-code', 'codex', 'mock'],
  globalMaxConcurrency: 2,
  backendMaxConcurrency: { antigravity: 2, claudeCode: 1, codex: 1, mock: 5 },
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
    codex: {
      binPath: 'codex', model: 'gpt-6-sol', effort: 'high', timeoutSeconds: 900,
      sandboxMode: 'workspace-write', ephemeral: true,
    },
    mock: {
      delayMs: 500,
    },
  },
  engineProfiles: [],
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
    this.reportsDir = resolve(options?.reportsDir ?? './data/reports');
    this.worktreeManager = new WorktreeManager(
      resolve(options?.cacheDir ?? './data/cache'),
      resolve(options?.worktreeDir ?? './.worktrees')
    );
    this.recoverStaleJobs().catch((err) => {
      console.error('Failed to recover stale jobs on startup', { error: String(err) });
    });
  }

  private resolveEngineInstance(
    engineName: string,
    settings: AppSettings
  ): ReviewEngine {
    if (this.defaultEngine) {
      return this.defaultEngine;
    }

    const matchedProfile = resolveRuleEngineProfile(
      engineName,
      settings.engineProfiles,
      settings.defaultEngineProfileId,
    );
    if (matchedProfile) {
      if (matchedProfile.engineType === 'mock') {
        return new MockReviewEngine({ delayMs: matchedProfile.config.delayMs });
      }
      if (matchedProfile.engineType === 'claude-code') {
        const cfg = matchedProfile.config;
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
          customEnv: resolveEngineEnvironment({}, settings.engineSettings?.claudeCode?.customEnv, cfg.customEnv),
          maxTurns: cfg.maxTurns,
        });
      }
      if (matchedProfile.engineType === 'antigravity') {
        const cfg = matchedProfile.config;
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
          customEnv: resolveEngineEnvironment({}, settings.engineSettings?.antigravity?.customEnv, cfg.customEnv),
        });
      }
      if (matchedProfile.engineType === 'codex') {
        const cfg = matchedProfile.config;
        return new CodexEngine({
          codexBinaryPath: cfg.binPath,
          model: cfg.model,
          effort: cfg.effort,
          timeoutMs: (cfg.timeoutSeconds ?? 900) * 1000,
          systemPrompt: cfg.systemPrompt,
          sandboxMode: cfg.sandboxMode,
          ephemeral: cfg.ephemeral,
          customArgs: cfg.customArgs,
          customEnv: resolveEngineEnvironment({}, settings.engineSettings?.codex?.customEnv, cfg.customEnv),
        });
      }
    }

    throw new Error(
      `有効な実行プロファイルが見つかりません: ${engineName}。AI 実行設定でプロファイルを確認してください。`,
    );
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

  async enqueueRules(requestId: string, ruleIdsParam?: string | string[], engineProfileIdParam?: string): Promise<string[]> {
    const requests = await this.db
      .select()
      .from(reviewRequestsTable)
      .where(eq(reviewRequestsTable.id, requestId));

    let pr = requests[0];
    if (!pr) {
      throw new Error(`レビュー対象のプルリクエストが見つかりません: ${requestId}`);
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
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        engine: r.engine,
        instructions: r.instructions,
        trigger,
        enabled: Boolean(r.enabled),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    let targetRules: ReviewRule[] = [];

    if (ruleIdsParam) {
      const ids = Array.isArray(ruleIdsParam) ? ruleIdsParam : [ruleIdsParam];
      targetRules = rules.filter((r) => r.enabled && ids.includes(r.id));
      if (targetRules.length === 0) {
        throw new Error(`指定されたレビュールールが見つからないか、無効化されています: ${ids.join(', ')}`);
      }
    } else {
      // 自動選定: PR Pre-flight 評価
      let changedFiles: string[] = [];
      if (this.vcsProvider) {
        try {
          const diffText = await this.vcsProvider.getDiff(pr.repository, pr.number);
          changedFiles = Array.from(extractChangedFilesFromDiff(diffText));
        } catch (err) {
          console.warn('Failed to get diff for PR during rule auto-selection', {
            repository: pr.repository,
            number: pr.number,
            error: String(err),
          });
          throw new Error(`PRの変更差分取得に失敗したため、レビュールールの自動選定を中止しました: ${err}`);
        }
      }

      if (changedFiles.length === 0) {
        throw new Error('PRの変更差分が存在しないか取得できなかったため、レビュールールを自動選定できませんでした。');
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

      const triggerRecords = await this.db.select().from(reviewTriggersTable);
      const triggers: ReviewTrigger[] = triggerRecords.map((t) => {
        let paths: string[] | undefined = undefined;
        let pathsIgnore: string[] | undefined = undefined;
        let ruleIds: string[] = [];
        try {
          if (t.pathsJson) paths = JSON.parse(t.pathsJson);
          if (t.pathsIgnoreJson) pathsIgnore = JSON.parse(t.pathsIgnoreJson);
          if (t.ruleIdsJson) ruleIds = JSON.parse(t.ruleIdsJson);
        } catch {
          // ignore
        }
        return {
          id: t.id,
          name: t.name,
          repository: t.repository,
          paths,
          pathsIgnore,
          ruleIds,
          enabled: Boolean(t.enabled),
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      });

      const event = {
        eventType: 'synchronize' as const,
        repository: pr.repository,
        changedFiles,
        isDraft: Boolean(pr.isDraft),
        labels: parsedLabels,
      };

      let matchedTriggerIds: string[] = [];
      // 対象リポジトリ（またはワイルドカード '*'）に合致する ReviewTrigger を優先選定
      const applicableTriggers = triggers.filter(
        (t) => t.repository === '*' || t.repository === pr.repository,
      );
      if (applicableTriggers.length > 0) {
        const result = evaluateTriggersForRules(applicableTriggers, rules, event);
        matchedTriggerIds = result.matchedTriggerIds;
        targetRules = result.matchedRules;
      } else {
        // 該当リポジトリに ReviewTrigger が未登録の場合のみ、各ルールの trigger 条件で判定
        targetRules = rules.filter((r) => r.enabled && matchRuleTrigger(r, event));
      }

      if (targetRules.length === 0) {
        throw new Error('実行対象のレビュールールがありません。有効なルールまたはパス条件（トリガー）を設定してください。');
      }

      console.log('Automated rule selection completed', {
        repository: pr.repository,
        prNumber: pr.number,
        changedFilesCount: changedFiles.length,
        matchedTriggerIds,
        selectedRuleIds: targetRules.map((r) => r.id),
      });
    }

    const availableProfiles = settings.engineProfiles?.filter((profile) => profile.enabled !== false) ?? [];
    if (availableProfiles.length === 0) {
      throw new Error('有効な AI 実行プロファイルが登録されていません。AI 実行設定でプロファイルを追加してください。');
    }

    const defaultProfile = availableProfiles.find(
      (profile) => profile.id === settings.defaultEngineProfileId,
    ) ?? availableProfiles.find((profile) => profile.isDefault) ?? availableProfiles[0];

    let selectedProfile: typeof availableProfiles[number] | undefined;
    if (engineProfileIdParam) {
      selectedProfile = availableProfiles.find((profile) => profile.id === engineProfileIdParam);
      if (!selectedProfile) {
        throw new Error(`指定された実行プロファイルが見つかりません: ${engineProfileIdParam}`);
      }
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

      let resolvedProfileId: string;
      if (selectedProfile) {
        resolvedProfileId = selectedProfile.id;
      } else {
        const ruleProfileKey = rule.engineProfileId ?? (rule.engine && rule.engine !== 'default' ? rule.engine : undefined);
        if (ruleProfileKey) {
          const ruleProfile = availableProfiles.find((p) => p.id === ruleProfileKey);
          if (!ruleProfile) {
            throw new Error(`ルール「${rule.name}」に設定されている実行プロファイル「${ruleProfileKey}」が見つかりません。`);
          }
          resolvedProfileId = ruleProfile.id;
        } else {
          resolvedProfileId = defaultProfile.id;
        }
      }

      const jobId = crypto.randomUUID();
      await this.db.insert(reviewJobsTable).values({
        id: jobId,
        requestId,
        userId: 'default',
        status: 'pending',
        engine: resolvedProfileId,
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
        : DEFAULT_APP_SETTINGS;

      const globalLimit = settings.globalMaxConcurrency ?? 2;
      const backendLimits = settings.backendMaxConcurrency ?? {
        antigravity: 2,
        claudeCode: 1,
        codex: 1,
        mock: 5,
      };

      while (this.jobQueue.length > 0 && this.runningJobIds.size < globalLimit) {
        // 現在走っている各エンジンの数を集約
        const runningJobs = await this.db
          .select()
          .from(reviewJobsTable)
          .where(eq(reviewJobsTable.status, 'running'));

        const toEngineType = (engineOrProfileId?: string | null): string => {
          if (!engineOrProfileId) return 'antigravity';
          const prof = resolveRuleEngineProfile(
            engineOrProfileId,
            settings.engineProfiles,
            settings.defaultEngineProfileId,
          );
          return prof?.engineType ?? engineOrProfileId;
        };

        const runningEngineCount: Record<string, number> = {
          antigravity: 0,
          'claude-code': 0,
          codex: 0,
          mock: 0,
        };
        for (const j of runningJobs) {
          const engType = toEngineType(j.engine);
          runningEngineCount[engType] = (runningEngineCount[engType] ?? 0) + 1;
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

          const engineType = toEngineType(jobRecord.engine);
          let limit = 2;
          if (engineType === 'antigravity') limit = backendLimits.antigravity;
          else if (engineType === 'claude-code') limit = backendLimits.claudeCode;
          else if (engineType === 'codex') limit = backendLimits.codex;
          else if (engineType === 'mock') limit = backendLimits.mock;

          const currentRunning = runningEngineCount[engineType] ?? 0;
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
          rule = {
            id: r.id,
            name: r.name,
            description: r.description,
            category: r.category,
            engine: r.engine,
            instructions: r.instructions,
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

      const engineInstance = this.resolveEngineInstance(job.engine, settings);

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
          const metadata = {
            ...result.ruleResult.metadata,
            ...(result.reportData ? { reviewReport: result.reportData } : {}),
          };
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
            metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
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

      // 静穏状態判定 (Quiescence Check):
      // 同一 PR かつ同一 headSha のアクティブジョブ数を検査
      // 全て完了または失敗して静穏状態になったら集約を実行
      try {
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

        if (activeJobs.length === 0) {
          await aggregateRuleResults(this.db, this.storage, {
            requestId: pr.id,
            headSha: job.headSha || pr.headSha,
            jobId,
          });
        }
      } catch (aggErr) {
        console.error('Failed to aggregate rule results on job completion', {
          requestId: pr.id,
          jobId,
          error: String(aggErr),
        });
      }
    }
  }
}
