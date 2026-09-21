import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  GitPullRequest, 
  GitPullRequestDraft,
  GitMerge,
  GitPullRequestClosed,
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Play, 
  FileText,
  X,
  GitBranch,
  Maximize2,
  Minimize2,
  Filter,
  Settings,
  Cpu,
  Save,
  Link2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Milestone,
  Tag,
  User,
} from 'lucide-react';

import { SearchQueryBar } from './components/SearchQueryBar.tsx';
import { ReviewReportView } from './components/review/ReviewReportView.tsx';
import { filterByGitHubQuery } from './utils/query-parser.ts';
import { parseUrlParams, buildUrlSearch } from './utils/url-params.ts';

interface ReviewItem {
  id: string;
  provider: string;
  repository: string;
  number: number;
  title: string;
  author: string;
  url: string;
  sourceBranch: string;
  targetBranch: string;
  headSha: string;
  isDraft: boolean;
  isOwn?: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  labels?: Array<{ name: string; color?: string; description?: string }>;
  milestone?: string | null;
  assignees?: Array<{ login: string; avatarUrl?: string }>;
  latestJob: {
    id: string;
    status: 'pending' | 'queued' | 'running' | 'completed' | 'failed';
    engine?: string;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
  } | null;
  report: {
    id: string;
    summary: string | null;
    verdict: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES' | null;
    createdAt: string;
  } | null;
}

interface AppSettings {
  autoQueue: boolean;
  autoQueueIncludeOwn: boolean;
  reviewEngine: 'antigravity' | 'claude-code' | 'mock';
  agyBin: string;
  claudeBin: string;
}

export default function App() {
  const initialParams = useMemo(() => {
    return parseUrlParams(window.location.search);
  }, []);

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(initialParams.report ?? null);
  const [selectedPrTitle, setSelectedPrTitle] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unreviewed' | 'completed'>(initialParams.status ?? 'all');
  const [repoFilter, setRepoFilter] = useState<string>(initialParams.repo ?? 'all');
  const [searchQuery, setSearchQuery] = useState<string>(initialParams.q ?? '');
  const [includeOwn, setIncludeOwn] = useState<boolean>(initialParams.includeOwn ?? false);

  // Settings state
  const [settings, setSettings] = useState<AppSettings>({
    autoQueue: false,
    autoQueueIncludeOwn: false,
    reviewEngine: 'antigravity',
    agyBin: 'agy',
    claudeBin: 'claude',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Log modal state
  const [logModalJobId, setLogModalJobId] = useState<string | null>(null);
  const [jobLogContent, setJobLogContent] = useState<string | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items);
      setErrorMessage(null);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
      setErrorMessage('レビュー一覧の取得に失敗しました。サーバーの稼働状態を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setFormSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchSettings();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchReviews();
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchReviews();
      }
    }, 15000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Sync state changes back to URL query parameters
  useEffect(() => {
    const currentSearch = buildUrlSearch({
      q: searchQuery,
      status: statusFilter,
      repo: repoFilter,
      report: selectedReportId ?? undefined,
      includeOwn: includeOwn ? true : undefined,
    });

    const newUrl = `${window.location.pathname}${currentSearch}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (newUrl !== currentUrl) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchQuery, statusFilter, repoFilter, selectedReportId, includeOwn]);

  // Handle browser back/forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = parseUrlParams(window.location.search);
      setSearchQuery(params.q ?? '');
      setStatusFilter(params.status ?? 'all');
      setRepoFilter(params.repo ?? 'all');
      setSelectedReportId(params.report ?? null);
      setIncludeOwn(params.includeOwn ?? false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auto restore PR title when selectedReportId is initialized from URL
  useEffect(() => {
    if (selectedReportId && items.length > 0) {
      const matched = items.find((item) => item.report?.id === selectedReportId);
      if (matched) {
        setSelectedPrTitle(matched.title);
      }
    }
  }, [items, selectedReportId]);

  // List of items that have a report, for prev/next navigation
  const reportItems = useMemo(() => {
    return items.filter((item) => Boolean(item.report?.id));
  }, [items]);

  const currentReportIndex = useMemo(() => {
    if (!selectedReportId) return -1;
    return reportItems.findIndex((item) => item.report?.id === selectedReportId);
  }, [reportItems, selectedReportId]);

  const prevReport = currentReportIndex > 0 ? reportItems[currentReportIndex - 1] : null;
  const nextReport = currentReportIndex >= 0 && currentReportIndex < reportItems.length - 1 ? reportItems[currentReportIndex + 1] : null;

  // Esc key to return to PR list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedReportId && !logModalJobId && !isSettingsOpen) {
        setSelectedReportId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReportId, logModalJobId, isSettingsOpen]);

  // Copy current filter URL to clipboard
  const handleCopyFilterUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSuccessMessage('現在のフィルタURLをクリップボードにコピーしました');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch {
      setErrorMessage('URLのコピーに失敗しました');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/reviews/refresh', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Refresh failed: HTTP ${res.status}`);
      }
      await fetchReviews();
    } catch (err) {
      console.error('Failed to refresh reviews', err);
      setErrorMessage('GitHubの最新状態取得に失敗しました。gh CLIの認証を確認してください。');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunReview = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}/run`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Run review failed: HTTP ${res.status}`);
      }
      await fetchReviews();
    } catch (err) {
      console.error('Failed to trigger review', err);
      setErrorMessage('AIレビューの実行要求に失敗しました。');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setIsSettingsOpen(false);
        setSuccessMessage('設定を保存しました。');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      setErrorMessage('設定の保存に失敗しました。');
    } finally {
      setSavingSettings(false);
    }
  };

  const openJobLog = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setLogModalJobId(jobId);
    setLoadingLog(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/log`);
      if (res.ok) {
        const text = await res.text();
        setJobLogContent(text);
      } else {
        setJobLogContent('ログが存在しないか、取得できませんでした。');
      }
    } catch {
      setJobLogContent('ログ取得中にエラーが発生しました。');
    } finally {
      setLoadingLog(false);
    }
  };

  // Distinct repositories and authors list
  const repositories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      set.add(item.repository);
    }
    return Array.from(set).sort();
  }, [items]);

  const authors = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.author) {
        set.add(item.author);
      }
    }
    return Array.from(set).sort();
  }, [items]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.sourceBranch) {
        set.add(item.sourceBranch);
      }
      if (item.targetBranch) {
        set.add(item.targetBranch);
      }
    }
    return Array.from(set).sort();
  }, [items]);

  const ownPrCount = useMemo(() => {
    return items.filter((item) => Boolean(item.isOwn)).length;
  }, [items]);

  const baseItems = useMemo(() => {
    if (includeOwn) return items;
    return items.filter((item) => !item.isOwn);
  }, [items, includeOwn]);

  const filteredItems = useMemo(() => {
    // 1. First filter by GitHub query syntax
    const queryMatched = filterByGitHubQuery(items, searchQuery);

    // 2. Then apply UI tab/dropdown filters and own PR filter
    return queryMatched.filter((item) => {
      if (!includeOwn && item.isOwn) {
        return false;
      }
      if (statusFilter === 'unreviewed' && item.latestJob?.status === 'completed') {
        return false;
      }
      if (statusFilter === 'completed' && item.latestJob?.status !== 'completed') {
        return false;
      }
      if (repoFilter !== 'all' && item.repository !== repoFilter) {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, statusFilter, repoFilter, includeOwn]);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0d1117] text-[#c9d1d9]">
      {/* Top Header */}
      <header className="h-16 border-b border-[#30363d] bg-[#161b22] px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#21262d] rounded-lg border border-[#30363d] text-sky-400">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              review-base
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 font-normal">
                MVP
              </span>
            </h1>
            <p className="text-xs text-[#8b949e] flex items-center gap-1.5">
              <span>Automated AI Review Dashboard</span>
              <span>•</span>
              <span className="text-sky-400/90 font-mono">Engine: {settings.reviewEngine}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* GitHub Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-sm text-[#c9d1d9] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{refreshing ? '更新中...' : 'GitHubを再確認'}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              setFormSettings(settings);
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] transition-colors"
            title="設定を開く"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Notifications */}
      {errorMessage && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-300 px-6 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 px-6 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left List Pane (Only visible when no report is selected) */}
        {!selectedReportId && (
          <main className="flex-1 flex flex-col overflow-y-auto p-6 max-w-6xl mx-auto w-full">
            {/* Search Query Bar with Autocomplete Suggestions & Copy URL */}
            <div className="mb-4 flex items-center gap-2">
              <SearchQueryBar
                query={searchQuery}
                onChange={setSearchQuery}
                authors={authors}
                repositories={repositories}
                branches={branches}
              />
              <button
                onClick={handleCopyFilterUrl}
                title="現在の検索・フィルタ条件のURLをコピー"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#8b949e] rounded-lg text-xs text-[#8b949e] hover:text-white transition-colors shrink-0"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">URLをコピー</span>
              </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Toggle */}
                <div className="flex items-center bg-[#161b22] p-1 rounded-lg border border-[#30363d] text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-md transition-colors ${statusFilter === 'all' ? 'bg-[#21262d] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
                  >
                    すべて ({baseItems.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('unreviewed')}
                    className={`px-3 py-1 rounded-md transition-colors ${statusFilter === 'unreviewed' ? 'bg-[#21262d] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
                  >
                    未完了 ({baseItems.filter((i) => i.latestJob?.status !== 'completed').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-1 rounded-md transition-colors ${statusFilter === 'completed' ? 'bg-[#21262d] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
                  >
                    レポートあり ({baseItems.filter((i) => i.latestJob?.status === 'completed').length})
                  </button>
                </div>

                {/* Repository Filter Dropdown */}
                {repositories.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-[#8b949e]">
                    <Filter className="w-3.5 h-3.5 text-sky-400" />
                    <select
                      value={repoFilter}
                      onChange={(e) => setRepoFilter(e.target.value)}
                      className="bg-transparent text-white focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-[#161b22] text-white">全リポジトリ</option>
                      {repositories.map((repo) => (
                        <option key={repo} value={repo} className="bg-[#161b22] text-white">
                          {repo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 自分のPRを含むトグル */}
                <label className="flex items-center gap-1.5 bg-[#161b22] border border-[#30363d] hover:border-[#8b949e] rounded-lg px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={includeOwn}
                    onChange={(e) => setIncludeOwn(e.target.checked)}
                    className="rounded border-[#30363d] bg-[#0d1117] text-[#00AFA8] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-[#00AFA8]"
                  />
                  <span className={includeOwn ? 'text-white font-medium' : ''}>自作PRを含む</span>
                  {ownPrCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                      {ownPrCount}
                    </span>
                  )}
                </label>
              </div>

              <span className="text-xs text-[#8b949e]">
                表示中: {filteredItems.length} 件
              </span>
            </div>

            {/* List items */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 text-[#8b949e]">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-sky-400" />
                <p className="text-sm font-medium">レビュー依頼を取得しています...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center p-12 bg-[#161b22] rounded-xl border border-[#30363d] text-[#8b949e]">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-base font-medium text-white mb-1">対象のレビュー依頼はありません</p>
                <p className="text-sm">現在あなた宛てに届いているオープンなPRはすべて完了しています。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const isSelected = selectedReportId !== null && item.report?.id === selectedReportId;
                  const jobStatus = item.latestJob?.status;
                  const orgName = item.repository.split('/')[0];

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-[#161b22] ring-1 ring-sky-500'
                          : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58]'
                      }`}
                    >
                      {/* Header: Project Icon & Repo / PR number / Badges (Left) & Status / GitHub Link (Right) */}
                      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#21262d] mb-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {/* Project / Organization Icon */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <img
                              src={`https://github.com/${orgName}.png?size=32`}
                              alt={orgName}
                              className="w-4 h-4 rounded-sm shrink-0 bg-neutral-800"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="text-xs text-[#8b949e] font-mono hover:text-white transition-colors">
                              {item.repository}
                            </span>
                            <span className="text-xs text-neutral-400 font-mono font-medium">
                              #{item.number}
                            </span>
                          </div>

                          {item.isDraft && (
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                              Draft
                            </span>
                          )}

                          {item.milestone && (
                            <span
                              className="text-[11px] px-2 py-0.5 rounded bg-[#21262d] text-teal-300 border border-[#30363d] font-mono flex items-center gap-1 shrink-0"
                              title={`マイルストーン: ${item.milestone}`}
                            >
                              <Milestone className="w-3 h-3 text-[#00AFA8]" />
                              <span>{item.milestone}</span>
                            </span>
                          )}
                        </div>

                        {/* Status Badge & GitHub External Link */}
                        <div className="flex items-center gap-2 shrink-0">
                          {jobStatus === 'running' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-950 text-sky-400 border border-sky-800">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              レビュー実行中
                            </span>
                          ) : jobStatus === 'pending' || jobStatus === 'queued' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
                              <Clock className="w-3 h-3" />
                              キュー待機中
                            </span>
                          ) : jobStatus === 'completed' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              レビュー完了
                              {item.report?.verdict && (
                                <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-900/60 text-[10px]">
                                  {item.report.verdict}
                                </span>
                              )}
                            </span>
                          ) : jobStatus === 'failed' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950 text-rose-400 border border-rose-800">
                              <AlertCircle className="w-3 h-3" />
                              失敗
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                              未レビュー
                            </span>
                          )}

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
                            title="GitHubで開く"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      {/* Body: PR Status Icon + Title (Left) & Labels (Right) */}
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.isDraft ? (
                            <GitPullRequestDraft
                              className="w-4 h-4 text-neutral-400 shrink-0"
                              title="Draft Pull Request"
                            />
                          ) : item.state === 'merged' ? (
                            <GitMerge
                              className="w-4 h-4 text-purple-400 shrink-0"
                              title="Merged Pull Request"
                            />
                          ) : item.state === 'closed' ? (
                            <GitPullRequestClosed
                              className="w-4 h-4 text-rose-400 shrink-0"
                              title="Closed Pull Request"
                            />
                          ) : (
                            <GitPullRequest
                              className="w-4 h-4 text-emerald-400 shrink-0"
                              title="Open Pull Request"
                            />
                          )}

                          <h2
                            className="text-sm md:text-base font-semibold text-white truncate leading-snug"
                            title={item.title}
                          >
                            {item.title}
                          </h2>
                        </div>

                        {/* タグ (ラベル) 一覧: 右寄せ */}
                        {item.labels && item.labels.length > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {item.labels.map((lbl) => (
                              <span
                                key={lbl.name}
                                className="inline-flex items-center text-[10.5px] px-2 py-0.5 rounded-md font-medium border transition-colors"
                                style={{
                                  backgroundColor: lbl.color ? `#${lbl.color}18` : '#21262d',
                                  borderColor: lbl.color ? `#${lbl.color}45` : '#30363d',
                                  color: lbl.color ? `#${lbl.color}` : '#c9d1d9',
                                }}
                                title={lbl.description || lbl.name}
                              >
                                {lbl.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer: Metadata & Action Buttons */}
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-[#21262d]/80 text-xs text-[#8b949e] flex-wrap md:flex-nowrap">
                        {/* Left metadata */}
                        <div className="flex items-center gap-3.5 flex-wrap min-w-0">
                          {/* Author */}
                          <span className="flex items-center gap-1 shrink-0">
                            <span className="text-[#8b949e]">by</span>
                            <span className="text-neutral-300 font-medium">@{item.author}</span>
                          </span>

                          {/* Assignees */}
                          {item.assignees && item.assignees.length > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-neutral-500">担当:</span>
                              <div className="flex items-center gap-2">
                                {item.assignees.map((assignee) => (
                                  <span
                                    key={assignee.login}
                                    className="inline-flex items-center gap-1 text-neutral-300 font-medium"
                                    title={`担当: @${assignee.login}`}
                                  >
                                    {assignee.avatarUrl ? (
                                      <img
                                        src={assignee.avatarUrl}
                                        alt={assignee.login}
                                        className="w-4 h-4 rounded-full border border-[#30363d]"
                                      />
                                    ) : (
                                      <User className="w-3.5 h-3.5 text-neutral-400" />
                                    )}
                                    <span>@{assignee.login}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Branch */}
                          {item.sourceBranch && (
                            <span
                              className="flex items-center gap-1 font-mono truncate max-w-[220px]"
                              title={`ブランチ: ${item.sourceBranch}`}
                            >
                              <GitBranch className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                              <span className="truncate">{item.sourceBranch}</span>
                            </span>
                          )}

                          {/* Updated At */}
                          <span className="shrink-0 text-neutral-500">
                            更新: {new Date(item.updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Right action buttons */}
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          {item.latestJob?.error && (
                            <span
                              title={item.latestJob.error}
                              className="text-[11px] text-rose-400 truncate max-w-xs cursor-help"
                            >
                              {item.latestJob.error}
                            </span>
                          )}

                          {item.latestJob?.id && (
                            <button
                              onClick={(e) => openJobLog(e, item.latestJob!.id)}
                              className="px-2 py-1 rounded text-xs bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] transition-colors"
                              title="実行ログを表示"
                            >
                              ログ
                            </button>
                          )}

                          <button
                            onClick={(e) => handleRunReview(e, item.id)}
                            disabled={jobStatus === 'running' || jobStatus === 'pending'}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors disabled:opacity-50"
                            title="AIレビューを実行"
                          >
                            <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
                            <span>{jobStatus === 'completed' ? '再実行' : 'レビュー開始'}</span>
                          </button>

                          {item.report?.id && (
                            <button
                              onClick={() => {
                                setSelectedReportId(item.report!.id);
                                setSelectedPrTitle(`${item.repository}#${item.number}: ${item.title}`);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-sm transition-colors"
                              title="レビューレポートを表示"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>レポート表示</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* Fullscreen Review Workspace (When report is selected) */}
        {selectedReportId && (
          <div className="flex-1 flex flex-col w-full h-full bg-[#0d1117] overflow-hidden">
            {/* Review Workspace Top Navigation Bar */}
            <div className="h-12 border-b border-[#30363d] px-4 sm:px-6 flex items-center justify-between bg-[#161b22] shrink-0 select-none">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedReportId(null)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-medium border border-[#30363d] transition-colors"
                  title="PR一覧に戻る (Esc)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#00AFA8]" />
                  <span>PR一覧</span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono bg-[#0d1117] text-gray-400 rounded border border-[#30363d]">Esc</kbd>
                </button>

                <div className="h-4 w-px bg-[#30363d] hidden sm:block" />

                <div className="flex items-center gap-2 min-w-0 text-xs font-mono text-gray-400">
                  {reportItems[currentReportIndex] && (
                    <>
                      <span className="truncate hidden md:inline text-gray-400">{reportItems[currentReportIndex].repository}</span>
                      <span className="hidden md:inline">·</span>
                      <span className="font-bold text-gray-200">PR #{reportItems[currentReportIndex].number}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Prev / Next PR buttons */}
                {reportItems.length > 1 && (
                  <div className="flex items-center rounded-lg bg-[#21262d] border border-[#30363d] p-0.5 text-xs">
                    <button
                      type="button"
                      disabled={!prevReport}
                      onClick={() => {
                        if (prevReport) {
                          setSelectedReportId(prevReport.report!.id);
                          setSelectedPrTitle(prevReport.title);
                        }
                      }}
                      className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      title={prevReport ? `前のPR: #${prevReport.number} ${prevReport.title}` : '前のPRはありません'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-[11px] font-mono text-gray-300">
                      {currentReportIndex >= 0 ? `${currentReportIndex + 1} / ${reportItems.length}` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={!nextReport}
                      onClick={() => {
                        if (nextReport) {
                          setSelectedReportId(nextReport.report!.id);
                          setSelectedPrTitle(nextReport.title);
                        }
                      }}
                      className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      title={nextReport ? `次のPR: #${nextReport.number} ${nextReport.title}` : '次のPRはありません'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedReportId(null)}
                  className="p-1.5 rounded-lg hover:bg-[#21262d] text-gray-400 hover:text-white transition-colors"
                  title="閉じて一覧に戻る (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Review Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ReviewReportView reportId={selectedReportId} />
            </div>
          </div>
        )}
      </div>

      {/* Execution Log Modal */}
      {logModalJobId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>実行ログ</span>
                <span className="text-xs font-mono text-[#8b949e] bg-[#21262d] px-2 py-0.5 rounded">
                  {logModalJobId}
                </span>
              </h3>
              <button
                onClick={() => {
                  setLogModalJobId(null);
                  setJobLogContent(null);
                }}
                className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto font-mono text-xs text-[#c9d1d9] bg-[#0d1117] whitespace-pre-wrap leading-relaxed">
              {loadingLog ? (
                <div className="flex items-center gap-2 text-[#8b949e]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ログを取得しています...</span>
                </div>
              ) : (
                jobLogContent || 'ログが存在しません。'
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#21262d]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-400" />
                <span>システム設定</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
              {/* Review Engine Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white uppercase tracking-wider block">
                  AI レビューエンジン
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, reviewEngine: 'antigravity' })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formSettings.reviewEngine === 'antigravity'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <div className="font-semibold text-sm text-sky-400 flex items-center gap-1.5 mb-1">
                      <Cpu className="w-4 h-4" />
                      <span>antigravity</span>
                    </div>
                    <p className="text-[11px] text-[#8b949e] leading-snug">
                      agy CLI を使用 (推奨)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, reviewEngine: 'claude-code' })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formSettings.reviewEngine === 'claude-code'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <div className="font-semibold text-sm text-sky-400 flex items-center gap-1.5 mb-1">
                      <Cpu className="w-4 h-4" />
                      <span>claude-code</span>
                    </div>
                    <p className="text-[11px] text-[#8b949e] leading-snug">
                      claude -p を使用
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, reviewEngine: 'mock' })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formSettings.reviewEngine === 'mock'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <div className="font-semibold text-sm text-sky-400 flex items-center gap-1.5 mb-1">
                      <Cpu className="w-4 h-4" />
                      <span>mock</span>
                    </div>
                    <p className="text-[11px] text-[#8b949e] leading-snug">
                      テスト用ダミー生成
                    </p>
                  </button>
                </div>
              </div>

              {/* Binary Paths */}
              {formSettings.reviewEngine === 'antigravity' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white block">
                    Antigravity CLI パス (agy)
                  </label>
                  <input
                    type="text"
                    value={formSettings.agyBin}
                    onChange={(e) => setFormSettings({ ...formSettings, agyBin: e.target.value })}
                    placeholder="agy または /path/to/agy"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-[#8b949e]">
                    デフォルト: <code>agy</code>（PATH上に見つからない場合は絶対パスを指定）
                  </p>
                </div>
              )}

              {formSettings.reviewEngine === 'claude-code' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white block">
                    Claude Code CLI パス (claude)
                  </label>
                  <input
                    type="text"
                    value={formSettings.claudeBin}
                    onChange={(e) => setFormSettings({ ...formSettings, claudeBin: e.target.value })}
                    placeholder="claude または /path/to/claude"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-[#8b949e]">
                    デフォルト: <code>claude</code>（PATH上に見つからない場合は絶対パスを指定）
                  </p>
                </div>
              )}

              {/* Auto Queue Options */}
              <div className="space-y-4 pt-2 border-t border-[#30363d]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">自動キューイング</div>
                    <p className="text-[11px] text-[#8b949e]">
                      新着PRを検知次第、自動でレビューキューに投入する
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, autoQueue: !formSettings.autoQueue })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      formSettings.autoQueue
                        ? 'bg-sky-950 border-sky-700 text-sky-400'
                        : 'bg-[#21262d] border-[#30363d] text-[#8b949e]'
                    }`}
                  >
                    {formSettings.autoQueue ? '有効 (ON)' : '無効 (OFF)'}
                  </button>
                </div>

                {/* Include Own PRs in Auto Queue */}
                <div className={`flex items-center justify-between pl-3 border-l-2 transition-opacity ${
                  formSettings.autoQueue ? 'border-sky-500/50' : 'border-[#30363d] opacity-40'
                }`}>
                  <div>
                    <div className="text-xs font-semibold text-white">自身のPRも含める</div>
                    <p className="text-[11px] text-[#8b949e]">
                      OFFの場合、自身が作成したPRは自動レビューせず手動実行待ちにします
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!formSettings.autoQueue}
                    onClick={() => setFormSettings({ ...formSettings, autoQueueIncludeOwn: !formSettings.autoQueueIncludeOwn })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:cursor-not-allowed ${
                      formSettings.autoQueueIncludeOwn
                        ? 'bg-purple-950 border-purple-700 text-purple-300'
                        : 'bg-[#21262d] border-[#30363d] text-[#8b949e]'
                    }`}
                  >
                    {formSettings.autoQueueIncludeOwn ? '含む' : '含めない'}
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#30363d] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-[#8b949e] hover:text-white transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? '保存中...' : '設定を保存'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
