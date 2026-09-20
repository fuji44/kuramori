import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  GitPullRequest, 
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
  Zap,
  Settings,
  Cpu,
  Save,
  Link2
} from 'lucide-react';

import { SearchQueryBar } from './components/SearchQueryBar.tsx';
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
  state: string;
  createdAt: string;
  updatedAt: string;
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

  // Settings state
  const [settings, setSettings] = useState<AppSettings>({
    autoQueue: false,
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
    });

    const newUrl = `${window.location.pathname}${currentSearch}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (newUrl !== currentUrl) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchQuery, statusFilter, repoFilter, selectedReportId]);

  // Handle browser back/forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = parseUrlParams(window.location.search);
      setSearchQuery(params.q ?? '');
      setStatusFilter(params.status ?? 'all');
      setRepoFilter(params.repo ?? 'all');
      setSelectedReportId(params.report ?? null);
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

  const handleToggleAutoQueue = async () => {
    const nextVal = !settings.autoQueue;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoQueue: nextVal }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setFormSettings(data);
      }
    } catch (err) {
      console.error('Failed to update autoQueue setting', err);
      setErrorMessage('自動キューイング設定の更新に失敗しました。');
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

  const filteredItems = useMemo(() => {
    // 1. First filter by GitHub query syntax
    const queryMatched = filterByGitHubQuery(items, searchQuery);

    // 2. Then apply UI tab/dropdown filters
    return queryMatched.filter((item) => {
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
  }, [items, searchQuery, statusFilter, repoFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9]">
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
          {/* Auto Queue Toggle */}
          <button
            onClick={handleToggleAutoQueue}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
              settings.autoQueue
                ? 'bg-sky-950 border-sky-700 text-sky-400 hover:bg-sky-900'
                : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
            title="新着PRを検知した際に自動でレビューキューに投入するかどうか"
          >
            <Zap className={`w-3.5 h-3.5 ${settings.autoQueue ? 'fill-sky-400 text-sky-400' : 'text-[#8b949e]'}`} />
            <span>自動キューイング: {settings.autoQueue ? 'ON' : 'OFF'}</span>
          </button>

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
        {/* Left List Pane */}
        {(!selectedReportId || !isMaximized) && (
          <main className={`flex-1 flex flex-col overflow-y-auto p-6 ${selectedReportId ? 'max-w-xl lg:max-w-2xl border-r border-[#30363d]' : 'max-w-6xl mx-auto w-full'}`}>
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
                    すべて ({items.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('unreviewed')}
                    className={`px-3 py-1 rounded-md transition-colors ${statusFilter === 'unreviewed' ? 'bg-[#21262d] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
                  >
                    未完了 ({items.filter((i) => i.latestJob?.status !== 'completed').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-1 rounded-md transition-colors ${statusFilter === 'completed' ? 'bg-[#21262d] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
                  >
                    レポートあり ({items.filter((i) => i.latestJob?.status === 'completed').length})
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

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.report?.id) {
                          setSelectedReportId(item.report.id);
                          setSelectedPrTitle(`${item.repository}#${item.number}: ${item.title}`);
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-[#161b22] ring-1 ring-sky-500'
                          : 'border-[#30363d] bg-[#161b22] hover:border-[#8b949e]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                              {item.repository}#{item.number}
                            </span>
                            {item.isDraft && (
                              <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                                Draft
                              </span>
                            )}
                            <span className="text-xs text-[#8b949e]">by @{item.author}</span>
                          </div>

                          <h2 className="text-sm md:text-base font-semibold text-white truncate mb-2">
                            {item.title}
                          </h2>

                          <div className="flex items-center gap-4 text-xs text-[#8b949e]">
                            {item.sourceBranch && (
                              <span className="flex items-center gap-1 font-mono truncate">
                                <GitBranch className="w-3.5 h-3.5 shrink-0" />
                                {item.sourceBranch}
                              </span>
                            )}
                            <span className="shrink-0">更新: {new Date(item.updatedAt).toLocaleString('ja-JP')}</span>
                          </div>
                        </div>

                        {/* Status Badges & Actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {/* Status badge */}
                          {jobStatus === 'running' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-950 text-sky-400 border border-sky-800">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              レビュー実行中
                            </span>
                          ) : jobStatus === 'pending' || jobStatus === 'queued' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
                              <Clock className="w-3.5 h-3.5" />
                              キュー待機中
                            </span>
                          ) : jobStatus === 'completed' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              レビュー完了
                              {item.report?.verdict && (
                                <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-900/60 text-[10px]">
                                  {item.report.verdict}
                                </span>
                              )}
                            </span>
                          ) : jobStatus === 'failed' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950 text-rose-400 border border-rose-800">
                              <AlertCircle className="w-3.5 h-3.5" />
                              失敗
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                              未レビュー
                            </span>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
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

                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
                              title="GitHubで開く"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

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
                                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-sky-950 hover:bg-sky-900 text-sky-400 border border-sky-800 transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                <span>レポート表示</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* Right Preview Pane (Report iframe) */}
        {selectedReportId && (
          <aside className={`flex-1 flex flex-col bg-[#161b22] border-l border-[#30363d] overflow-hidden ${isMaximized ? 'w-full' : ''}`}>
            <div className="h-14 border-b border-[#30363d] px-6 flex items-center justify-between bg-[#21262d]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                <h3 className="text-sm font-semibold text-white truncate">
                  {selectedPrTitle ?? 'AI レビューレポート'}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1.5 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
                  title={isMaximized ? '通常サイズに戻す' : '最大化'}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <a
                  href={`/api/reports/${selectedReportId}/html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 rounded text-xs bg-[#161b22] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>別タブで開く</span>
                </a>

                <button
                  onClick={() => {
                    setSelectedReportId(null);
                    setIsMaximized(false);
                  }}
                  className="p-1.5 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
                  title="閉じる"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white">
              <iframe
                src={`/api/reports/${selectedReportId}/html`}
                title="AI Review Report"
                sandbox="allow-scripts allow-popups"
                className="w-full h-full border-none"
              />
            </div>
          </aside>
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

              {/* Auto Queue Option */}
              <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
                <div>
                  <div className="text-xs font-semibold text-white">自動キューイング</div>
                  <p className="text-[11px] text-[#8b949e]">
                    レビュー依頼の届いた新着PRを検知次第、自動でキューに積む
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
