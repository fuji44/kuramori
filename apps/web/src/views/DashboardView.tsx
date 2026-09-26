import React, { useMemo } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderGit2,
  ArrowRight,
  Cpu,
  FileText,
  RefreshCw,
  Activity,
  Sliders,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { ReviewItem, AppSettings, ReviewRule, ReviewTrigger, resolveRuleEngineProfile } from '../types.ts';
import { getPrAnchorId } from '../utils/anchor.ts';
import { useI18n } from '../i18n/context.tsx';

interface DashboardViewProps {
  items: ReviewItem[];
  settings: AppSettings;
  rules?: ReviewRule[];
  triggers?: ReviewTrigger[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onNavigateToReviews: (queryOrAnchorId?: string) => void;
  onNavigateToReports?: (verdict?: string) => void;
  onSelectReport: (reportId: string, prTitle: string) => void;
  onNavigateToSettings?: (subview?: string) => void;
  onOpenLog?: (e: React.MouseEvent, jobId: string, error?: string | null) => void;
}

export function DashboardView({
  items,
  settings,
  rules = [],
  triggers = [],
  refreshing = false,
  onRefresh,
  onNavigateToReviews,
  onNavigateToReports,
  onSelectReport,
  onNavigateToSettings,
  onOpenLog,
}: DashboardViewProps) {
  const { t, formatRelativeTime } = useI18n();

  // Statistics calculations
  const stats = useMemo(() => {
    const unreviewed = items.filter(
      (item) => item.latestJob?.status !== 'completed'
    ).length;
    const completed = items.filter(
      (item) => item.latestJob?.status === 'completed'
    ).length;
    const running = items.filter(
      (item) => item.latestJob?.status === 'running'
    ).length;
    const queued = items.filter(
      (item) => item.latestJob?.status === 'queued'
    ).length;
    const failed = items.filter(
      (item) => item.latestJob?.status === 'failed'
    ).length;

    const reportItems = items.filter((item) => Boolean(item.report?.id));
    const approve = reportItems.filter((i) => i.report?.verdict === 'APPROVE').length;
    const comment = reportItems.filter((i) => i.report?.verdict === 'COMMENT').length;
    const requestChanges = reportItems.filter((i) => i.report?.verdict === 'REQUEST_CHANGES').length;

    const attention = requestChanges + failed;
    const repos = new Set(items.map((i) => i.repository)).size;

    return {
      unreviewed,
      completed,
      running,
      queued,
      failed,
      approve,
      comment,
      requestChanges,
      attention,
      repos,
      total: items.length,
      reportTotal: reportItems.length,
    };
  }, [items]);

  // Action required PRs (unreviewed / pending / failed), up to 5
  const pendingPrs = useMemo(() => {
    return items
      .filter((item) => item.latestJob?.status !== 'completed')
      .slice(0, 5);
  }, [items]);

  // Recent completed reports, up to 5
  const recentReports = useMemo(() => {
    return items
      .filter((item) => Boolean(item.report?.id))
      .sort((a, b) => {
        const timeA = a.report?.createdAt ? new Date(a.report.createdAt).getTime() : 0;
        const timeB = b.report?.createdAt ? new Date(b.report.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [items]);

  // Repository PR counts
  const repoCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.repository, (counts.get(item.repository) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [items]);

  // Active default engine profile
  const defaultProfile = useMemo(() => {
    return resolveRuleEngineProfile(
      settings.defaultBackendId ?? settings.reviewEngine,
      settings.engineProfiles,
      settings.defaultEngineProfileId,
    );
  }, [settings]);

  const enabledRulesCount = useMemo(() => {
    return rules.filter((r) => r.enabled).length;
  }, [rules]);

  const enabledTriggersCount = useMemo(() => {
    return triggers.filter((t) => t.enabled).length;
  }, [triggers]);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{t('dashboard.title')}</span>
          </h2>
          <p className="text-xs text-[#8b949e] mt-1">
            {t('dashboard.desc')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium rounded-lg border border-[#30363d] shadow-sm transition-colors disabled:opacity-50"
              title={t('dashboard.refreshGithub')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : 'text-[#8b949e]'}`} />
              <span>{refreshing ? t('dashboard.refreshingGithub') : t('dashboard.refreshGithub')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateToReviews()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>{t('dashboard.openPrList')}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* 未完了 PR */}
        <div
          onClick={() => onNavigateToReviews('is:unreviewed')}
          className="bg-[#161b22] border border-[#30363d] hover:border-amber-500/50 rounded-xl p-4 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{t('dashboard.unreviewedKpi')}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats.unreviewed}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">{t('dashboard.unreviewedKpiDesc')}</p>
        </div>

        {/* 稼働中ジョブ */}
        <div
          onClick={() => onNavigateToReviews(stats.running > 0 ? 'status:running' : undefined)}
          className={`bg-[#161b22] border border-[#30363d] rounded-xl p-4 transition-colors ${
            stats.running > 0 || stats.queued > 0
              ? 'cursor-pointer hover:border-sky-500/50'
              : ''
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{t('dashboard.runningKpi')}</span>
            <Activity className={`w-4 h-4 ${stats.running > 0 ? 'text-sky-400 animate-pulse' : 'text-neutral-500'}`} />
          </div>
          <div className="text-2xl font-bold text-white font-mono flex items-center gap-2">
            <span>{stats.running + stats.queued}</span>
            {stats.running > 0 && (
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                {t('dashboard.runningBadge', { count: stats.running })}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {stats.running > 0 || stats.queued > 0
              ? t('dashboard.queuedBadge', { count: stats.queued })
              : t('dashboard.idleJobs')}
          </p>
        </div>

        {/* 完了レポート */}
        <div
          onClick={() => onNavigateToReports?.()}
          className={`bg-[#161b22] border border-[#30363d] rounded-xl p-4 transition-colors ${
            onNavigateToReports ? 'cursor-pointer hover:border-emerald-500/50' : ''
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{t('dashboard.completedKpi')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats.completed}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">{t('dashboard.completedKpiDesc')}</p>
        </div>

        {/* 要注意 / 注目 */}
        <div
          onClick={() => {
            if (stats.requestChanges > 0) {
              onNavigateToReports?.('REQUEST_CHANGES');
            } else if (stats.failed > 0) {
              onNavigateToReviews('status:failed');
            }
          }}
          className={`bg-[#161b22] border border-[#30363d] rounded-xl p-4 transition-colors ${
            stats.attention > 0 ? 'cursor-pointer hover:border-rose-500/50' : ''
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{t('dashboard.actionRequiredKpi')}</span>
            <AlertTriangle className={`w-4 h-4 ${stats.attention > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats.attention}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {stats.attention > 0
              ? t('dashboard.actionRequiredDesc', { changes: stats.requestChanges, failed: stats.failed })
              : t('dashboard.noAttentionDesc')}
          </p>
        </div>
      </div>

      {/* Main Grid: Left (Actionable Lists) & Right (Automation & Quality Insights) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Actionable Lists (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 対応待ちのPR */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#21262d]">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('dashboard.pendingPrsSection')}</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigateToReviews('is:unreviewed')}
                className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
              >
                <span>{t('dashboard.viewAllPrs', { count: stats.unreviewed })}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {pendingPrs.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-500">
                {t('dashboard.noPendingPrs')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingPrs.map((item) => {
                  const relativeTime = formatRelativeTime(item.updatedAt);
                  const isRunning = item.latestJob?.status === 'running';
                  const isQueued = item.latestJob?.status === 'queued';
                  const isFailed = item.latestJob?.status === 'failed';

                  return (
                    <div
                      key={item.id}
                      onClick={() => onNavigateToReviews(getPrAnchorId(item.repository, item.number))}
                      className="p-3 rounded-lg bg-[#0d1117] border border-[#21262d] hover:border-sky-700/60 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-neutral-400 truncate">
                            {item.repository} #{item.number}
                          </span>
                          {item.isDraft && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 shrink-0">
                              Draft
                            </span>
                          )}
                          {isRunning && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 shrink-0 animate-pulse flex items-center gap-1">
                              <Activity className="w-2.5 h-2.5" />
                              <span>{t('dashboard.jobReviewing')}</span>
                            </span>
                          )}
                          {isQueued && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800 shrink-0">
                              {t('dashboard.jobQueued')}
                            </span>
                          )}
                          {isFailed && (
                            <span
                              onClick={(e) => {
                                if (item.latestJob?.id) {
                                  onOpenLog?.(e, item.latestJob.id, item.latestJob.error);
                                }
                              }}
                              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 shrink-0 flex items-center gap-1 hover:underline"
                              title={t('dashboard.viewErrorLog')}
                            >
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>{t('dashboard.jobFailed')}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 shrink-0">
                          {relativeTime && <span>{relativeTime}</span>}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#161b22] text-neutral-400">
                            @{item.author}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-white font-medium truncate group-hover:text-sky-300 transition-colors">
                        {item.title}
                      </div>
                      {(typeof item.additions === 'number' || typeof item.deletions === 'number') && (
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-neutral-500">
                          <span className="text-emerald-400">+{item.additions ?? 0}</span>
                          <span className="text-rose-400">-{item.deletions ?? 0}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 最近のレビューレポート */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#21262d]">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('dashboard.recentReportsSection')}</span>
              </h3>
              <button
                type="button"
                onClick={() => (onNavigateToReports ? onNavigateToReports() : onNavigateToReviews())}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
              >
                <span>{t('dashboard.viewAllReports', { count: stats.completed })}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentReports.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-500">
                {t('dashboard.noReports')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentReports.map((item) => {
                  const relativeTime = item.report?.createdAt
                    ? formatRelativeTime(item.report.createdAt)
                    : '';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.report?.id) {
                          onSelectReport(item.report.id, `${item.repository}#${item.number}: ${item.title}`);
                        }
                      }}
                      className="p-3 rounded-lg bg-[#0d1117] border border-[#21262d] hover:border-emerald-700/60 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.report?.verdict === 'APPROVE' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                              APPROVE
                            </span>
                          )}
                          {item.report?.verdict === 'REQUEST_CHANGES' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 shrink-0">
                              REQUEST CHANGES
                            </span>
                          )}
                          {item.report?.verdict === 'COMMENT' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 shrink-0">
                              COMMENT
                            </span>
                          )}
                          <span className="font-mono text-neutral-400 truncate">
                            {item.repository} #{item.number}
                          </span>
                        </div>
                        {relativeTime && (
                          <span className="text-[11px] text-neutral-500 shrink-0">
                            {relativeTime}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white font-medium truncate group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </div>
                      {item.report?.summary && (
                        <p className="mt-1 text-[11px] text-neutral-400 line-clamp-1">
                          {item.report.summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Automation Health & Quality Insights (1 col) */}
        <div className="space-y-6">
          {/* レビュー自動化ステータス */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#21262d]">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('dashboard.automationStatusSection')}</span>
              </h3>
              {onNavigateToSettings && (
                <button
                  type="button"
                  onClick={() => onNavigateToSettings('general')}
                  className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#21262d] transition-colors"
                  title={t('dashboard.openSettingsTooltip')}
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* 自動キュー */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{t('dashboard.autoQueueLabel')}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    settings.autoQueue
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {settings.autoQueue ? t('dashboard.autoQueueActive') : t('dashboard.autoQueueManual')}
                </span>
              </div>

              {/* 既定プロファイル */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{t('dashboard.defaultProfileLabel')}</span>
                <span className="font-mono text-purple-300 truncate max-w-[160px]" title={defaultProfile?.name ?? settings.reviewEngine}>
                  {defaultProfile?.name ?? settings.reviewEngine}
                </span>
              </div>

              {/* レビュールール */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{t('dashboard.activeRulesLabel')}</span>
                <span className="font-mono text-neutral-300">
                  {t('dashboard.rulesCountSuffix', { active: enabledRulesCount, total: rules.length })}
                </span>
              </div>

              {/* トリガー設定 */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{t('dashboard.activeTriggersLabel')}</span>
                <span className="font-mono text-neutral-300">
                  {t('dashboard.triggersCountSuffix', { count: enabledTriggersCount })}
                </span>
              </div>

              {/* 並列実行枠 */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{t('dashboard.maxConcurrencyLabel')}</span>
                <span className="font-mono text-neutral-300">
                  {t('dashboard.concurrencySuffix', { count: settings.globalMaxConcurrency })}
                </span>
              </div>
            </div>

            {onNavigateToSettings && (
              <div className="mt-4 pt-3 border-t border-[#21262d]">
                <button
                  type="button"
                  onClick={() => onNavigateToSettings('rules')}
                  className="w-full py-1.5 px-2 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded text-[11px] text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileCode className="w-3 h-3 text-sky-400" />
                  <span>{t('dashboard.openRulesAndProfiles')}</span>
                </button>
              </div>
            )}
          </div>

          {/* 判定サマリ & レビュー品質 */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#21262d]">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('dashboard.verdictBreakdownSection')}</span>
              </h3>
              <span className="text-[11px] font-mono text-neutral-500">
                {t('dashboard.verdictTotalSuffix', { count: stats.reportTotal })}
              </span>
            </div>

            {stats.reportTotal === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                {t('dashboard.noVerdicts')}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Ratio bar */}
                <div className="h-2 w-full bg-[#0d1117] rounded-full overflow-hidden flex border border-[#21262d]">
                  {stats.approve > 0 && (
                    <div
                      style={{ width: `${(stats.approve / stats.reportTotal) * 100}%` }}
                      className="bg-emerald-500 h-full"
                      title={`APPROVE: ${stats.approve}`}
                    />
                  )}
                  {stats.comment > 0 && (
                    <div
                      style={{ width: `${(stats.comment / stats.reportTotal) * 100}%` }}
                      className="bg-sky-500 h-full"
                      title={`COMMENT: ${stats.comment}`}
                    />
                  )}
                  {stats.requestChanges > 0 && (
                    <div
                      style={{ width: `${(stats.requestChanges / stats.reportTotal) * 100}%` }}
                      className="bg-rose-500 h-full"
                      title={`REQUEST CHANGES: ${stats.requestChanges}`}
                    />
                  )}
                </div>

                {/* Legend list */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span>APPROVE</span>
                    </span>
                    <span className="font-mono text-neutral-300">{stats.approve}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                      <span>COMMENT</span>
                    </span>
                    <span className="font-mono text-neutral-300">{stats.comment}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      <span>REQUEST CHANGES</span>
                    </span>
                    <span className="font-mono text-neutral-300">{stats.requestChanges}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Repositories summary */}
            {repoCounts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#21262d]">
                <div className="text-[11px] font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t('dashboard.monitoredReposLabel', { count: stats.repos })}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {repoCounts.map(([repo, count]) => (
                    <span
                      key={repo}
                      onClick={() => onNavigateToReviews(`repo:${repo}`)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0d1117] border border-[#21262d] text-neutral-300 hover:border-sky-700/60 cursor-pointer transition-colors"
                      title={t('dashboard.repoPrCountTitle', { repo, count })}
                    >
                      {repo.split('/')[1] ?? repo} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
