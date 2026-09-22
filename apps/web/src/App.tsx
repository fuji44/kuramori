import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  X,
  Settings,
  LayoutDashboard,
  FileText,
} from 'lucide-react';

import { ReviewItem, AppSettings } from './types.ts';
import { useAppRoute, AppRoute, navigateTo } from './utils/route.ts';
import { DashboardView } from './views/DashboardView.tsx';
import { PrListView } from './views/PrListView.tsx';
import { ReportDetailView } from './views/ReportDetailView.tsx';
import { ReportListView } from './views/ReportListView.tsx';
import { JobLogModal } from './components/JobLogModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ToastContainer, ToastItem, ToastType } from './components/Toast.tsx';

export default function App() {
  const [route, navigate] = useAppRoute();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: ToastType = 'info', durationMs = 3500) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (durationMs > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    }
  };

  const showSuccess = (msg: string) => addToast(msg, 'success', 3500);
  const showError = (msg: string) => addToast(msg, 'error', 5000);
  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Settings state
  const [settings, setSettings] = useState<AppSettings>({
    autoQueue: false,
    autoQueueIncludeOwn: false,
    reviewEngine: 'antigravity',
    agyBin: 'agy',
    claudeBin: 'claude',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Job log modal state
  const [logModalJobId, setLogModalJobId] = useState<string | null>(null);
  const [logModalError, setLogModalError] = useState<string | null>(null);
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
    } catch (err) {
      console.error('Failed to fetch reviews', err);
      showError('レビュー一覧の取得に失敗しました。サーバーの稼働状態を確認してください。');
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

  // Esc key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (logModalJobId) {
          setLogModalJobId(null);
          setLogModalError(null);
          setJobLogContent(null);
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (route.view === 'report') {
          navigate({ view: 'reviews', params: {} });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [route.view, logModalJobId, isSettingsOpen, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/reviews/refresh', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Refresh failed: HTTP ${res.status}`);
      }
      await fetchReviews();
      showSuccess('GitHubの最新レビュー依頼を更新しました');
    } catch (err) {
      console.error('Failed to refresh reviews', err);
      showError('GitHubの最新状態取得に失敗しました。gh CLIの認証を確認してください。');
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
      showSuccess('AIレビューをキューに投入しました');
      await fetchReviews();
    } catch (err) {
      console.error('Failed to trigger review', err);
      showError('AIレビューの実行要求に失敗しました。');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        showSuccess('設定を保存しました。');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      showError('設定の保存に失敗しました。');
      throw err;
    }
  };

  const openJobLog = async (e: React.MouseEvent, jobId: string, error?: string | null) => {
    e.stopPropagation();
    setLogModalJobId(jobId);
    setLogModalError(error ?? null);
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

  const unreviewedCount = items.filter(
    (item) => item.latestJob?.status !== 'completed' && !item.isOwn
  ).length;

  const reportCount = items.filter((item) => Boolean(item.report?.id)).length;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0d1117] text-[#c9d1d9]">
      {/* Optimized Top Header */}
      <header className="h-14 border-b border-[#30363d] bg-[#161b22] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Logo & Brand */}
          <div
            onClick={() => navigate({ view: 'dashboard' })}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="ダッシュボードへ"
          >
            <div className="p-1.5 bg-[#21262d] rounded-lg border border-[#30363d] group-hover:border-sky-500/50 text-sky-400 transition-colors">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">review-base</h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-950 text-sky-400 border border-sky-800/80 font-mono">
                MVP
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-[#30363d]" />

          {/* Navigation Links (Dashboard vs PRs vs Reports) */}
          <nav className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-[#30363d] text-xs">
            <button
              type="button"
              onClick={() => navigate({ view: 'dashboard' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                route.view === 'dashboard'
                  ? 'bg-[#21262d] text-white font-medium shadow-sm'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>ダッシュボード</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ view: 'reviews', params: route.view === 'reviews' ? route.params : {} })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                route.view === 'reviews'
                  ? 'bg-[#21262d] text-white font-medium shadow-sm'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>PR一覧</span>
              {unreviewedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800">
                  {unreviewedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate({ view: 'reports' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                route.view === 'reports'
                  ? 'bg-[#21262d] text-white font-medium shadow-sm'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>レポート一覧</span>
              {reportCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {reportCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-[#c9d1d9] transition-colors"
            title="設定を開く"
          >
            <Settings className="w-3.5 h-3.5 text-[#8b949e]" />
            <span className="hidden sm:inline">設定</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {route.view === 'dashboard' && (
          <DashboardView
            items={items}
            settings={settings}
            onNavigateToReviews={(anchorId) => {
              if (typeof anchorId === 'string' && anchorId.trim() !== '') {
                navigateTo(`/reviews#${anchorId}`);
              } else {
                navigate({ view: 'reviews', params: {} });
              }
            }}
            onNavigateToReports={() => navigate({ view: 'reports' })}
            onSelectReport={(reportId) => navigate({ view: 'report', reportId })}
          />
        )}

        {route.view === 'reviews' && (
          <PrListView
            items={items}
            loading={loading}
            refreshing={refreshing}
            params={route.params}
            onParamsChange={(newParams) => navigate({ view: 'reviews', params: newParams }, true)}
            onOpenLog={openJobLog}
            onRunReview={handleRunReview}
            onSelectReport={(reportId) => navigate({ view: 'report', reportId })}
            onRefresh={handleRefresh}
            onShowSuccess={showSuccess}
            onShowError={showError}
          />
        )}

        {route.view === 'reports' && (
          <ReportListView
            items={items}
            onSelectReport={(reportId, prTitle) => navigate({ view: 'report', reportId })}
            onNavigateToReviews={(anchorId) => {
              if (typeof anchorId === 'string' && anchorId.trim() !== '') {
                navigateTo(`/reviews#${anchorId}`);
              } else {
                navigate({ view: 'reviews', params: {} });
              }
            }}
          />
        )}

        {route.view === 'report' && (
          <ReportDetailView
            reportId={route.reportId}
            items={items}
            onBack={() => {
              // If previous history exists, we can go back, else fallback to reviews
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ view: 'reviews', params: {} });
              }
            }}
            onSelectReport={(reportId) => navigate({ view: 'report', reportId })}
          />
        )}
      </div>

      {/* Execution Log Modal */}
      <JobLogModal
        jobId={logModalJobId}
        error={logModalError}
        content={jobLogContent}
        loading={loadingLog}
        onClose={() => {
          setLogModalJobId(null);
          setLogModalError(null);
          setJobLogContent(null);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onSave={handleSaveSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Floating Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
