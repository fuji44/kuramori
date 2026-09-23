import React, { useMemo, useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2, Filter, Link2, CheckSquare, Square } from 'lucide-react';
import { EngineProfile, ReviewItem, ReviewRule } from '../types.ts';
import { SearchQueryBar } from '../components/SearchQueryBar.tsx';
import { PrCard } from '../components/PrCard.tsx';
import { filterByGitHubQuery } from '../utils/query-parser.ts';
import { FilterUrlParams } from '../utils/url-params.ts';
import { findMatchingPrElement, getPrAnchorId } from '../utils/anchor.ts';

interface PrListViewProps {
  items: ReviewItem[];
  rules?: ReviewRule[];
  defaultRuleIds?: string[];
  loading: boolean;
  refreshing?: boolean;
  params: FilterUrlParams;
  onParamsChange: (newParams: FilterUrlParams) => void;
  onOpenLog: (e: React.MouseEvent, jobId: string, error?: string | null) => void;
  onRunReview: (e: React.MouseEvent, id: string, ruleIds?: string[], engine?: string) => void;
  onSelectReport: (reportId: string, prTitle: string) => void;
  enabledEngines?: string[];
  engineProfiles?: EngineProfile[];
  onRefresh?: () => void;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function PrListView({
  items,
  rules = [],
  defaultRuleIds,
  loading,
  refreshing,
  params,
  onParamsChange,
  onOpenLog,
  onRunReview,
  onSelectReport,
  enabledEngines,
  engineProfiles,
  onRefresh,
  onShowSuccess,
  onShowError,
}: PrListViewProps) {
  const searchQuery = params.q ?? '';
  const statusFilter = params.status ?? 'all';
  const repoFilter = params.repo ?? 'all';
  const includeOwn = params.includeOwn ?? false;

  const [highlightedAnchor, setHighlightedAnchor] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const setParam = (key: keyof FilterUrlParams, val: any) => {
    onParamsChange({
      ...params,
      [key]: val,
    });
  };

  // Auto-scroll to anchor target when loaded or when hash changes
  useEffect(() => {
    if (loading || items.length === 0) return;

    const scrollToAnchor = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const el = findMatchingPrElement(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedAnchor(el.id);

        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = window.setTimeout(() => {
          setHighlightedAnchor(null);
        }, 2500);
      }
    };

    // Small timeout to allow DOM to settle
    const timer = setTimeout(scrollToAnchor, 100);
    window.addEventListener('hashchange', scrollToAnchor);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', scrollToAnchor);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [loading, items.length]);

  const handleSelectCard = (anchorId: string) => {
    window.history.replaceState(null, '', `#${anchorId}`);
    setHighlightedAnchor(anchorId);
  };

  const handleCopyAnchor = async (anchorId: string) => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${anchorId}`;
    try {
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, '', `#${anchorId}`);
      setHighlightedAnchor(anchorId);

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedAnchor(null);
      }, 2500);

      onShowSuccess(`PRアンカーURLをコピーしました (#${anchorId})`);
    } catch {
      onShowError('URLのコピーに失敗しました');
    }
  };

  // Distinct repositories, authors, branches
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
      if (item.sourceBranch) set.add(item.sourceBranch);
      if (item.targetBranch) set.add(item.targetBranch);
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
    const queryMatched = filterByGitHubQuery(items, searchQuery);
    return queryMatched.filter((item) => {
      if (!includeOwn && item.isOwn) return false;
      if (statusFilter === 'unreviewed' && item.latestJob?.status === 'completed') return false;
      if (statusFilter === 'completed' && item.latestJob?.status !== 'completed') return false;
      if (repoFilter !== 'all' && item.repository !== repoFilter) return false;
      return true;
    });
  }, [items, searchQuery, statusFilter, repoFilter, includeOwn]);

  const handleCopyFilterUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onShowSuccess('現在のフィルタURLをクリップボードにコピーしました');
    } catch {
      onShowError('URLのコピーに失敗しました');
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-y-auto p-6 max-w-6xl mx-auto w-full">
      {/* Search Query Bar with Autocomplete Suggestions & Copy URL */}
      <div className="mb-4 flex items-center gap-2">
        <SearchQueryBar
          query={searchQuery}
          onChange={(q) => setParam('q', q || undefined)}
          authors={authors}
          repositories={repositories}
          branches={branches}
        />
        <button
          type="button"
          onClick={handleCopyFilterUrl}
          title="現在の検索・フィルタ条件のURLをコピー"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#8b949e] rounded-lg text-xs text-[#8b949e] hover:text-white transition-colors shrink-0"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">URLをコピー</span>
        </button>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="GitHubから最新のレビュー依頼PRを再取得"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#8b949e] rounded-lg text-xs text-[#8b949e] hover:text-white transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? '更新中...' : '再確認'}</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Toggle */}
          <div className="flex items-center bg-[#161b22] p-1 rounded-lg border border-[#30363d] text-xs">
            <button
              type="button"
              onClick={() => setParam('status', 'all')}
              className={`px-3 py-1 rounded-md transition-colors ${statusFilter === 'all' ? 'bg-[#21262d] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              すべて ({baseItems.length})
            </button>
            <button
              type="button"
              onClick={() => setParam('status', 'unreviewed')}
              className={`px-3 py-1 rounded-md transition-colors ${statusFilter === 'unreviewed' ? 'bg-[#21262d] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              未完了 ({baseItems.filter((i) => i.latestJob?.status !== 'completed').length})
            </button>
            <button
              type="button"
              onClick={() => setParam('status', 'completed')}
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
                onChange={(e) => setParam('repo', e.target.value === 'all' ? undefined : e.target.value)}
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
          <button
            type="button"
            role="checkbox"
            aria-checked={includeOwn}
            onClick={() => setParam('includeOwn', !includeOwn ? true : undefined)}
            className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs cursor-pointer select-none transition-all ${
              includeOwn
                ? 'bg-sky-950/40 border-sky-800 text-white font-medium shadow-xs'
                : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <span className="shrink-0 text-sky-400">
              {includeOwn ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#8b949e]" />
              )}
            </span>
            <span>自作PRを含む</span>
            {ownPrCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                {ownPrCount}
              </span>
            )}
          </button>
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
          <p className="text-sm">現在該当するオープンなPRはありません。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const anchorId = getPrAnchorId(item.repository, item.number);
            return (
              <PrCard
                key={item.id}
                item={item}
                rules={rules}
                defaultRuleIds={defaultRuleIds}
                enabledEngines={enabledEngines}
                engineProfiles={engineProfiles}
                isHighlighted={highlightedAnchor === anchorId}
                onOpenLog={onOpenLog}
                onRunReview={onRunReview}
                onSelectReport={onSelectReport}
                onSelectCard={handleSelectCard}
                onCopyAnchor={handleCopyAnchor}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
