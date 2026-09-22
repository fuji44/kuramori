import React, { useMemo } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderGit2,
  ArrowRight,
  Cpu,
  FileText,
} from 'lucide-react';
import { ReviewItem, AppSettings } from '../types.ts';
import { getPrAnchorId } from '../utils/anchor.ts';

interface DashboardViewProps {
  items: ReviewItem[];
  settings: AppSettings;
  onNavigateToReviews: (anchorId?: string) => void;
  onSelectReport: (reportId: string, prTitle: string) => void;
}

export function DashboardView({
  items,
  settings,
  onNavigateToReviews,
  onSelectReport,
}: DashboardViewProps) {
  // Statistics calculations
  const stats = useMemo(() => {
    const unreviewed = items.filter(
      (item) => item.latestJob?.status !== 'completed' && !item.isOwn
    ).length;
    const completed = items.filter(
      (item) => item.latestJob?.status === 'completed'
    ).length;
    const failed = items.filter(
      (item) => item.latestJob?.status === 'failed'
    ).length;

    const repos = new Set(items.map((i) => i.repository)).size;

    return { unreviewed, completed, failed, repos, total: items.length };
  }, [items]);

  // Recent pending PRs (max 4)
  const pendingPrs = useMemo(() => {
    return items
      .filter((item) => item.latestJob?.status !== 'completed' && !item.isOwn)
      .slice(0, 4);
  }, [items]);

  // Recent completed reports (max 4)
  const recentReports = useMemo(() => {
    return items
      .filter((item) => Boolean(item.report?.id))
      .sort((a, b) => {
        const timeA = a.report?.createdAt ? new Date(a.report.createdAt).getTime() : 0;
        const timeB = b.report?.createdAt ? new Date(b.report.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 4);
  }, [items]);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Banner & Quick CTA */}
      <div className="bg-gradient-to-r from-sky-950/40 via-[#161b22] to-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            レビューダッシュボード
          </h2>
          <p className="text-xs text-[#8b949e]">
            現在監視中のレビュー依頼PRと、AIレビューの進行状況のサマリです。
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateToReviews()}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0"
        >
          <span>PR一覧を開く</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* 未完了 PR */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">未完了 PR</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats.unreviewed}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">対応待ちのPR</p>
        </div>

        {/* レビュー完了 */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">完了レポート</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats.completed}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">生成済みレポート</p>
        </div>

        {/* 対象リポジトリ */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">監視リポジトリ</span>
            <FolderGit2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats.repos}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">検知されたプロジェクト</p>
        </div>

        {/* 稼働エンジン */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">AIエンジン</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-purple-300 font-mono truncate">
            {settings.reviewEngine}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {settings.autoQueue ? '自動キュー: 有効' : '自動キュー: 無効'}
          </p>
        </div>
      </div>

      {/* 2-Column Section: Pending PRs & Recent Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 対応待ちのPR */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#21262d]">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>対応待ちのレビュー依頼</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateToReviews()}
              className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
            >
              すべて見る ({stats.unreviewed})
            </button>
          </div>

          {pendingPrs.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              対応待ちのPRはありません
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {pendingPrs.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToReviews(getPrAnchorId(item.repository, item.number))}
                  className="p-2.5 rounded-lg bg-[#0d1117] border border-[#21262d] hover:border-sky-700/60 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="font-mono text-neutral-400 truncate">
                      {item.repository} #{item.number}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 shrink-0">
                      @{item.author}
                    </span>
                  </div>
                  <div className="text-xs text-white font-medium truncate">
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最近のレビューレポート */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#21262d]">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>最近のレビューレポート</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateToReviews()}
              className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
            >
              PR一覧へ
            </button>
          </div>

          {recentReports.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              まだ作成されたレポートはありません
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {recentReports.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.report?.id) {
                      onSelectReport(item.report.id, `${item.repository}#${item.number}: ${item.title}`);
                    }
                  }}
                  className="p-2.5 rounded-lg bg-[#0d1117] border border-[#21262d] hover:border-emerald-700/60 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="font-mono text-neutral-400 truncate">
                      {item.repository} #{item.number}
                    </span>
                    {item.report?.verdict && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                        {item.report.verdict}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white font-medium truncate group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
