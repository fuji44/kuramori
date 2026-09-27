import { useMemo, useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  GitPullRequest,
  Clock,
  ArrowRight,
  Filter,
  X,
} from 'lucide-react';
import type { ReviewItem } from '../types.ts';
import { getPrAnchorId } from '../utils/anchor.ts';
import { useI18n } from '../i18n/context.tsx';

interface ReportListViewProps {
  items: ReviewItem[];
  onSelectReport: (reportId: string, prTitle: string) => void;
  onNavigateToReviews: (anchorId?: string) => void;
}

export function ReportListView({
  items,
  onSelectReport,
  onNavigateToReviews,
}: ReportListViewProps) {
  const { t, formatDate } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES'>('all');
  const [repoFilter, setRepoFilter] = useState<string>('all');

  // Filter items that actually have reports
  const reportItems = useMemo(() => {
    return items
      .filter((item) => Boolean(item.report?.id))
      .sort((a, b) => {
        const timeA = a.report?.createdAt ? new Date(a.report.createdAt).getTime() : 0;
        const timeB = b.report?.createdAt ? new Date(b.report.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [items]);

  // Unique repositories for filter dropdown
  const repositories = useMemo(() => {
    const set = new Set<string>();
    for (const item of reportItems) {
      set.add(item.repository);
    }
    return Array.from(set).sort();
  }, [reportItems]);

  // Summary counts
  const stats = useMemo(() => {
    const total = reportItems.length;
    const approve = reportItems.filter((i) => i.report?.verdict === 'APPROVE').length;
    const comment = reportItems.filter((i) => i.report?.verdict === 'COMMENT').length;
    const requestChanges = reportItems.filter((i) => i.report?.verdict === 'REQUEST_CHANGES').length;
    return { total, approve, comment, requestChanges };
  }, [reportItems]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reportItems.filter((item) => {
      // Verdict filter
      if (verdictFilter !== 'all' && item.report?.verdict !== verdictFilter) {
        return false;
      }
      // Repository filter
      if (repoFilter !== 'all' && item.repository !== repoFilter) {
        return false;
      }
      // Search query filter (matches title, repo, PR number, author)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchRepo = item.repository.toLowerCase().includes(q);
        const matchNumber = item.number.toString().includes(q);
        const matchAuthor = (item.author || '').toLowerCase().includes(q);
        const matchSummary = (item.report?.summary || '').toLowerCase().includes(q);
        if (!matchTitle && !matchRepo && !matchNumber && !matchAuthor && !matchSummary) {
          return false;
        }
      }
      return true;
    });
  }, [reportItems, verdictFilter, repoFilter, searchQuery]);

  const getVerdictBadge = (verdict: string | null | undefined) => {
    switch (verdict) {
      case 'APPROVE':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>APPROVE</span>
          </span>
        );
      case 'REQUEST_CHANGES':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-700/80">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>REQUEST CHANGES</span>
          </span>
        );
      case 'COMMENT':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-300 border border-sky-700/80">
            <MessageSquare className="w-3 h-3 text-sky-400" />
            <span>COMMENT</span>
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700">
            {verdict || 'REVIEWED'}
          </span>
        );
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header & Metrics Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>{t('reports.title')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-normal">
              {t('dashboard.countSuffix', { count: stats.total })}
            </span>
          </h2>
          <p className="text-xs text-[#8b949e] mt-1">
            {t('reports.desc')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToReviews()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-xs text-[#c9d1d9] transition-colors self-start sm:self-auto shrink-0"
        >
          <GitPullRequest className="w-3.5 h-3.5 text-sky-400" />
          <span>{t('reports.openPrList')}</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setVerdictFilter('all')}
          className={`p-3 rounded-xl border text-left transition-colors ${
            verdictFilter === 'all'
              ? 'bg-[#161b22] border-sky-600 ring-1 ring-sky-600/40'
              : 'bg-[#161b22] border-[#30363d] hover:border-[#8b949e]'
          }`}
        >
          <div className="text-[11px] text-neutral-400 font-medium">{t('reports.allReportsCard')}</div>
          <div className="text-xl font-bold text-white font-mono mt-0.5">{stats.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setVerdictFilter('APPROVE')}
          className={`p-3 rounded-xl border text-left transition-colors ${
            verdictFilter === 'APPROVE'
              ? 'bg-[#161b22] border-emerald-500 ring-1 ring-emerald-500/40'
              : 'bg-[#161b22] border-[#30363d] hover:border-[#8b949e]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-emerald-400 font-medium">
            <span>{t('reports.verdictApprove')}</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold text-emerald-300 font-mono mt-0.5">{stats.approve}</div>
        </button>

        <button
          type="button"
          onClick={() => setVerdictFilter('COMMENT')}
          className={`p-3 rounded-xl border text-left transition-colors ${
            verdictFilter === 'COMMENT'
              ? 'bg-[#161b22] border-sky-500 ring-1 ring-sky-500/40'
              : 'bg-[#161b22] border-[#30363d] hover:border-[#8b949e]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-sky-400 font-medium">
            <span>{t('reports.verdictComment')}</span>
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold text-sky-300 font-mono mt-0.5">{stats.comment}</div>
        </button>

        <button
          type="button"
          onClick={() => setVerdictFilter('REQUEST_CHANGES')}
          className={`p-3 rounded-xl border text-left transition-colors ${
            verdictFilter === 'REQUEST_CHANGES'
              ? 'bg-[#161b22] border-rose-500 ring-1 ring-rose-500/40'
              : 'bg-[#161b22] border-[#30363d] hover:border-[#8b949e]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-rose-400 font-medium">
            <span>{t('reports.verdictRequestChanges')}</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold text-rose-300 font-mono mt-0.5">{stats.requestChanges}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161b22] p-3 rounded-xl border border-[#30363d]">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('reports.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Repository Filter */}
          {repositories.length > 1 && (
            <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#8b949e]">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <select
                value={repoFilter}
                onChange={(e) => setRepoFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#161b22] text-white">
                  {t('reports.filterRepoAll')}
                </option>
                {repositories.map((repo) => (
                  <option key={repo} value={repo} className="bg-[#161b22] text-white">
                    {repo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filter Button */}
          {(verdictFilter !== 'all' || repoFilter !== 'all' || searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setVerdictFilter('all');
                setRepoFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-neutral-400 hover:text-white underline px-2 py-1"
            >
              {t('reports.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Reports List */}
      {reportItems.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">
            {t('reports.noReportsFoundTitle')}
          </h3>
          <p className="text-xs text-[#8b949e] max-w-sm mx-auto mb-4">
            {t('reports.noReportsFoundDesc')}
          </p>
          <button
            type="button"
            onClick={() => onNavigateToReviews()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <span>{t('reports.openPrList')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-12 text-center">
          <Search className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white mb-1">
            {t('reports.noMatchingReportsTitle')}
          </h3>
          <p className="text-xs text-[#8b949e] mb-4">
            {t('reports.noMatchingReportsDesc')}
          </p>
          <button
            type="button"
            onClick={() => {
              setVerdictFilter('all');
              setRepoFilter('all');
              setSearchQuery('');
            }}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-xs text-[#c9d1d9] transition-colors"
          >
            {t('reports.resetFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((item) => {
            if (item.report === undefined) return null;
            const reportId = item.report.id;
            const fullTitle = `${item.repository}#${item.number}: ${item.title}`;
            const anchorId = getPrAnchorId(item.repository, item.number);

            return (
              <div
                key={item.id}
                onClick={() => onSelectReport(reportId, fullTitle)}
                className="bg-[#161b22] border border-[#30363d] hover:border-emerald-500/50 rounded-xl p-4 transition-all duration-150 cursor-pointer group shadow-sm flex flex-col gap-3"
              >
                {/* Card Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-sky-400 font-medium">
                      {item.repository} #{item.number}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                      @{item.author}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getVerdictBadge(item.report?.verdict)}
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      {item.report?.createdAt ? formatDate(item.report.createdAt) : ''}
                    </span>
                  </div>
                </div>

                {/* PR Title */}
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </h3>
                </div>

                {/* Report Summary Snippet */}
                {item.report?.summary && (
                  <p className="text-xs text-neutral-300 bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d] line-clamp-2 leading-relaxed">
                    {item.report.summary}
                  </p>
                )}

                {/* Card Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#21262d] text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="font-mono">
                      {item.sourceBranch} → {item.targetBranch}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onNavigateToReviews(anchorId)}
                      className="text-[11px] text-neutral-400 hover:text-sky-300 transition-colors hover:underline"
                    >
                      {t('reports.viewInPulls')}
                    </button>
                    <span className="text-neutral-600">•</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onSelectReport(reportId, fullTitle)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 rounded-md text-[11px] font-medium transition-colors ml-1"
                    >
                      <span>{t('reports.detailedReport')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
