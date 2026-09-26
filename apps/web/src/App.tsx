import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  X,
  LayoutDashboard,
  FileText,
} from 'lucide-react';

import { ReviewItem, AppSettings, ReviewRule, ReviewTrigger, CurrentUser } from './types.ts';
import { useAppRoute, AppRoute, navigateTo } from './utils/route.ts';
import { DashboardView } from './views/DashboardView.tsx';
import { PrListView } from './views/PrListView.tsx';
import { ReportDetailView } from './views/ReportDetailView.tsx';
import { ReportListView } from './views/ReportListView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { JobLogModal } from './components/JobLogModal.tsx';
import { ToastContainer, ToastItem, ToastType } from './components/Toast.tsx';
import { useI18n } from './i18n/context.tsx';
import { UserMenuPopover } from './components/UserMenuPopover.tsx';

export default function App() {
  const { t } = useI18n();
  const [route, navigate] = useAppRoute();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [rules, setRules] = useState<ReviewRule[]>([]);
  const [triggers, setTriggers] = useState<ReviewTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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
    defaultRuleIds: ['preset-correctness'],
    defaultRuleId: 'preset-correctness',
    defaultBackendId: 'antigravity',
    globalMaxConcurrency: 2,
    backendMaxConcurrency: { antigravity: 2, claudeCode: 1, codex: 1, mock: 5 },
    engineSettings: {
      antigravity: {
        binPath: 'agy',
        model: 'gemini-2.5-pro',
        effort: 'high',
        timeoutSeconds: 900,
        printTimeout: '',
        sandbox: false,
        disableSlashCommands: false,
        customArgs: '',
      },
      claudeCode: {
        binPath: 'claude',
        model: 'sonnet',
        effort: 'high',
        timeoutSeconds: 900,
        allowedTools: '',
        bare: false,
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
  });

  // Job log modal state
  const [logModalJobId, setLogModalJobId] = useState<string | null>(null);
  const [logModalError, setLogModalError] = useState<string | null>(null);
  const [jobLogContent, setJobLogContent] = useState<string | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/pulls');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
      showError(t('toast.reviewsFetchError'));
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

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch rules', err);
    }
  };

  const fetchTriggers = async () => {
    try {
      const res = await fetch('/api/triggers');
      if (res.ok) {
        const data = await res.json();
        setTriggers(data.triggers ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch triggers', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch current user', err);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchSettings();
    fetchRules();
    fetchTriggers();
    fetchCurrentUser();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchReviews();
        fetchRules();
        fetchTriggers();
        fetchCurrentUser();
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
        if (route.view === 'report') {
          navigate({ view: 'reviews', params: {} });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [route.view, logModalJobId, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/pulls/refresh', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Refresh failed: HTTP ${res.status}`);
      }
      await fetchReviews();
      showSuccess(t('toast.reviewsRefreshSuccess'));
    } catch (err) {
      console.error('Failed to refresh reviews', err);
      showError(t('toast.reviewsRefreshError'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunReview = async (e: React.MouseEvent, id: string, ruleIds?: string[], engine?: string) => {
    e.stopPropagation();
    try {
      const payload: Record<string, unknown> = {};
      if (ruleIds && ruleIds.length > 0) {
        payload.ruleIds = ruleIds;
      }
      if (engine && engine !== 'default') {
        payload.engine = engine;
      }
      const res = await fetch(`/api/pulls/${encodeURIComponent(id)}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const serverError = typeof errorData?.error === 'string' ? errorData.error : undefined;
        throw new Error(serverError ?? `AIレビューの実行要求に失敗しました (HTTP ${res.status})`);
      }
      showSuccess(
        ruleIds && ruleIds.length > 0
          ? `${ruleIds.length} 件のルールをキューに投入しました${engine && engine !== 'default' ? ` (実行プロファイル: ${settings.engineProfiles?.find((profile) => profile.id === engine)?.name ?? engine})` : ''}`
          : 'AIレビューをキューに投入しました'
      );
      await fetchReviews();
    } catch (err: unknown) {
      console.error('Failed to trigger review', err);
      const message = err instanceof Error ? err.message : 'AIレビューの実行要求に失敗しました。';
      showError(message);
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
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      throw err;
    }
  };

  const handleUpdateDefaultRuleIds = async (ids: string[]) => {
    await handleSaveSettings({
      ...settings,
      defaultRuleIds: ids,
      defaultRuleId: ids[0] ?? '',
    });
  };

  const handleCreateRule = async (newRule: Partial<ReviewRule>) => {
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        await fetchRules();
      } else {
        throw new Error('Failed to create rule');
      }
    } catch (err) {
      console.error('Failed to create rule', err);
      throw err;
    }
  };

  const handleUpdateRule = async (id: string, updates: Partial<ReviewRule>) => {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await fetchRules();
      } else {
        throw new Error('Failed to update rule');
      }
    } catch (err) {
      console.error('Failed to update rule', err);
      throw err;
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchRules();
      } else {
        throw new Error('Failed to delete rule');
      }
    } catch (err) {
      console.error('Failed to delete rule', err);
      throw err;
    }
  };

  const handleCreateTrigger = async (newTrigger: Partial<ReviewTrigger>) => {
    try {
      const res = await fetch('/api/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrigger),
      });
      if (res.ok) {
        await fetchTriggers();
      } else {
        throw new Error('Failed to create trigger');
      }
    } catch (err) {
      console.error('Failed to create trigger', err);
      throw err;
    }
  };

  const handleUpdateTrigger = async (id: string, updates: Partial<ReviewTrigger>) => {
    try {
      const res = await fetch(`/api/triggers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await fetchTriggers();
      } else {
        throw new Error('Failed to update trigger');
      }
    } catch (err) {
      console.error('Failed to update trigger', err);
      throw err;
    }
  };

  const handleDeleteTrigger = async (id: string) => {
    try {
      const res = await fetch(`/api/triggers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchTriggers();
      } else {
        throw new Error('Failed to delete trigger');
      }
    } catch (err) {
      console.error('Failed to delete trigger', err);
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
    (item) => item.latestJob?.status !== 'completed'
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
            title={t('nav.dashboardTooltip')}
          >
            <img
              src="/favicon.svg"
              alt="kuramori"
              className="w-8 h-8 shrink-0 select-none"
            />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">kuramori</h1>
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
              <span>{t('nav.dashboard')}</span>
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
              <span>{t('nav.prs')}</span>
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
              <span>{t('nav.reports')}</span>
              {reportCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {reportCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* User & Settings Menu */}
          <UserMenuPopover
            user={currentUser}
            activeView={route.view}
            onNavigateSettings={(subview) => navigate({ view: 'settings', subview })}
          />
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {route.view === 'dashboard' && (
          <DashboardView
            items={items}
            settings={settings}
            rules={rules}
            triggers={triggers}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onNavigateToReviews={(filterOrAnchorId) => {
              if (
                filterOrAnchorId?.startsWith('is:') ||
                filterOrAnchorId?.startsWith('status:') ||
                filterOrAnchorId?.startsWith('repo:')
              ) {
                navigate({ view: 'reviews', params: { q: filterOrAnchorId } });
              } else if (typeof filterOrAnchorId === 'string' && filterOrAnchorId.trim() !== '') {
                navigateTo(`/pulls#${filterOrAnchorId}`);
              } else {
                navigate({ view: 'reviews', params: {} });
              }
            }}
            onNavigateToReports={() => navigate({ view: 'reports' })}
            onSelectReport={(reportId) => navigate({ view: 'report', reportId })}
            onNavigateToSettings={(subview) => navigate({ view: 'settings', subview: subview ?? 'general' })}
            onOpenLog={openJobLog}
          />
        )}

        {route.view === 'reviews' && (
          <PrListView
            items={items}
            rules={rules}
            defaultRuleIds={settings.defaultRuleIds}
            engineProfiles={settings.engineProfiles}
            loading={loading}
            refreshing={refreshing}
            params={route.params}
            activeFilterId={route.filterId}
            onParamsChange={(newParams) => navigate({ view: 'reviews', params: newParams, filterId: route.filterId }, true)}
            onSelectFilter={(filterId, filterParams) => navigate({ view: 'reviews', params: filterParams, filterId })}
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
                navigateTo(`/pulls#${anchorId}`);
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

        {route.view === 'settings' && (
          <SettingsView
            subview={route.subview}
            onNavigateSubview={(subview) => navigate({ view: 'settings', subview })}
            settings={settings}
            rules={rules}
            triggers={triggers}
            knownRepositories={Array.from(new Set(items.map((i) => i.repository))).filter(Boolean)}
            onSaveSettings={handleSaveSettings}
            onCreateRule={handleCreateRule}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
            onUpdateDefaultRuleIds={handleUpdateDefaultRuleIds}
            onCreateTrigger={handleCreateTrigger}
            onUpdateTrigger={handleUpdateTrigger}
            onDeleteTrigger={handleDeleteTrigger}
            onShowSuccess={showSuccess}
            onShowError={showError}
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

      {/* Floating Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
