import React, { useMemo, useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2, Link2, Inbox, Plus, Bookmark, Trash2 } from 'lucide-react';
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
  activeFilterId: string | undefined;
  onSelectFilter: (filterId: string | undefined, params: FilterUrlParams) => void;
  onOpenLog: (e: React.MouseEvent, jobId: string, error?: string | null) => void;
  onRunReview: (e: React.MouseEvent, id: string, ruleIds?: string[], engine?: string) => void;
  onSelectReport: (reportId: string, prTitle: string) => void;
  engineProfiles?: EngineProfile[];
  onRefresh?: () => void;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

interface SavedFilter {
  id: string;
  name: string;
  description: string;
  query: string;
}

export function PrListView({
  items,
  rules = [],
  defaultRuleIds,
  loading,
  refreshing,
  params,
  onParamsChange,
  activeFilterId,
  onSelectFilter,
  onOpenLog,
  onRunReview,
  onSelectReport,
  engineProfiles,
  onRefresh,
  onShowSuccess,
  onShowError,
}: PrListViewProps) {
  const searchQuery = params.q ?? '';
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await fetch('/api/pulls/filters');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setSavedFilters(data.filters ?? []);
      } catch (error) {
        console.error('Failed to fetch pull filters', error);
        onShowError('保存済みフィルタの取得に失敗しました');
      }
    };
    loadFilters();
  }, []);

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

  const filteredItems = useMemo(() => {
    return filterByGitHubQuery(items, searchQuery);
  }, [items, searchQuery]);

  const openFilter = (filter: SavedFilter | null) => {
    const nextParams = filter ? { q: filter.query || undefined } : {};
    onSelectFilter(filter?.id, nextParams);
  };

  const saveFilter = async () => {
    const name = filterName.trim();
    if (!name) return;
    const existing = activeFilterId ? savedFilters.find((filter) => filter.id === activeFilterId) : undefined;
    const values = {
      name,
      description: filterDescription.trim(),
      query: searchQuery,
    };
    try {
      const response = await fetch(existing ? `/api/pulls/filters/${encodeURIComponent(existing.id)}` : '/api/pulls/filters', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const nextFilter: SavedFilter = data.filter;
      setSavedFilters((current) => existing
        ? current.map((filter) => filter.id === existing.id ? nextFilter : filter)
        : [...current, nextFilter]);
      onSelectFilter(nextFilter.id, { q: nextFilter.query || undefined });
      setShowSaveForm(false);
      onShowSuccess(existing ? 'フィルタを更新しました' : 'フィルタを保存しました');
    } catch (error) {
      console.error('Failed to save pull filter', error);
      onShowError('フィルタの保存に失敗しました');
    }
  };

  const deleteFilter = async (filter: SavedFilter) => {
    try {
      const response = await fetch(`/api/pulls/filters/${encodeURIComponent(filter.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSavedFilters((current) => current.filter((item) => item.id !== filter.id));
      if (activeFilterId === filter.id) onSelectFilter(undefined, {});
      onShowSuccess('フィルタを削除しました');
    } catch (error) {
      console.error('Failed to delete pull filter', error);
      onShowError('フィルタの削除に失敗しました');
    }
  };

  const handleCopyFilterUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onShowSuccess('現在のフィルタURLをクリップボードにコピーしました');
    } catch {
      onShowError('URLのコピーに失敗しました');
    }
  };

  return (
    <div className="flex flex-1 min-h-0 w-full">
      <aside className="w-60 shrink-0 border-r border-[#30363d] bg-[#0d1117] p-3 overflow-y-auto max-sm:w-14 max-sm:px-2">
        <p className="px-3 pt-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6e7681] max-sm:hidden">ワークスペース</p>
        <button type="button" onClick={() => openFilter(null)} className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-left ${!activeFilterId ? 'bg-[#1f2937] text-white' : 'text-[#8b949e] hover:bg-[#161b22] hover:text-white'}`}>
          <Inbox className="h-4 w-4 shrink-0" /><span className="flex-1 max-sm:hidden">Inbox</span>
        </button>
        <div className="mt-7 flex items-center justify-between px-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6e7681] max-sm:hidden">保存済みフィルタ</p>
          <button type="button" onClick={() => { onSelectFilter(undefined, params); setFilterName(''); setFilterDescription(''); setShowSaveForm(true); }} title="フィルタを新規作成" className="rounded p-1 text-[#8b949e] hover:bg-[#21262d] hover:text-white"><Plus className="h-4 w-4" /></button>
        </div>
        <nav className="space-y-1">
          {savedFilters.map((filter) => (
            <div key={filter.id} className={`group flex items-center rounded-md ${activeFilterId === filter.id ? 'bg-[#1f2937]' : 'hover:bg-[#161b22]'}`}>
              <button type="button" onClick={() => openFilter(filter)} title={filter.name} className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${activeFilterId === filter.id ? 'text-white' : 'text-[#8b949e] group-hover:text-white'}`}><Bookmark className="mr-2 inline h-3.5 w-3.5" />{filter.name}</button>
              <button type="button" title="フィルタを削除" onClick={() => deleteFilter(filter)} className="mr-2 hidden rounded p-1 text-[#6e7681] hover:text-red-300 group-hover:block"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {savedFilters.length === 0 && <p className="px-3 py-2 text-xs text-[#6e7681] max-sm:hidden">フィルタはまだありません</p>}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto p-6 max-w-6xl mx-auto w-full">
      {activeFilterId ? (() => {
        const activeFilter = savedFilters.find((filter) => filter.id === activeFilterId);
        return activeFilter ? <section className="mb-5 border-b border-[#30363d] pb-4">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-white">{activeFilter.name}</h2><p className="mt-1 text-sm text-[#8b949e]">{activeFilter.description || '説明はありません'}</p></div><button type="button" onClick={() => { setFilterName(activeFilter.name); setFilterDescription(activeFilter.description); setShowSaveForm(true); }} className="rounded-md border border-[#30363d] px-3 py-1.5 text-xs text-[#c9d1d9] hover:bg-[#161b22]">編集</button></div>
        </section> : null;
      })() : <section className="mb-5 rounded-lg border border-[#30363d] bg-[#111820] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Inbox className="h-4 w-4 text-sky-400"/><h2 className="text-lg font-semibold text-white">Inbox</h2></div><p className="mt-1 text-sm text-[#8b949e]">確認が必要なPRをまとめて表示します。</p></div><div className="flex gap-5 text-sm"><div><span className="block text-xl font-semibold text-white">{items.length}</span><span className="text-xs text-[#8b949e]">すべて</span></div><div><span className="block text-xl font-semibold text-amber-300">{items.filter((item) => item.latestJob?.status !== 'completed').length}</span><span className="text-xs text-[#8b949e]">未完了</span></div><div><span className="block text-xl font-semibold text-emerald-300">{items.filter((item) => item.latestJob?.status === 'completed').length}</span><span className="text-xs text-[#8b949e]">レビュー済み</span></div></div></div>
      </section>}
      {showSaveForm && <section className="mb-4 rounded-lg border border-sky-800/70 bg-[#111820] p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#8b949e]">フィルタ名<input autoFocus value={filterName} onChange={(event) => setFilterName(event.target.value)} className="mt-1 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-sky-500" placeholder="例: 自分の担当リポジトリ" /></label><label className="text-xs text-[#8b949e]">説明文<input value={filterDescription} onChange={(event) => setFilterDescription(event.target.value)} className="mt-1 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-sky-500" placeholder="このフィルタで見つかるPR" /></label></div><p className="mt-2 text-xs text-[#6e7681]">クエリ: <code className="text-sky-300">{searchQuery || '（条件なし）'}</code></p><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setShowSaveForm(false)} className="px-3 py-1.5 text-xs text-[#8b949e]">キャンセル</button><button type="button" onClick={saveFilter} disabled={!filterName.trim()} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">保存</button></div></section>}
      {/* Search Query Bar with Autocomplete Suggestions & Copy URL */}
      <div className="mb-4 flex items-center gap-2">
        <SearchQueryBar
          query={searchQuery}
          onSubmit={(q) => setParam('q', q)}
          authors={authors}
          repositories={repositories}
          branches={branches}
        />
        {activeFilterId && <button type="button" onClick={() => { const selected = savedFilters.find((filter) => filter.id === activeFilterId); if (selected) { setFilterName(selected.name); setFilterDescription(selected.description); setShowSaveForm(true); } }} title="このフィルタを更新" className="shrink-0 rounded-lg border border-[#30363d] px-3 py-2 text-xs text-[#8b949e] hover:text-white"><Bookmark className="inline h-3.5 w-3.5 sm:mr-1.5"/><span className="hidden sm:inline">保存</span></button>}
        {!activeFilterId && <button type="button" onClick={() => { setFilterName(''); setFilterDescription(''); setShowSaveForm(true); }} title="現在のクエリを保存" className="shrink-0 rounded-lg border border-[#30363d] px-3 py-2 text-xs text-[#8b949e] hover:text-white"><Bookmark className="inline h-3.5 w-3.5 sm:mr-1.5"/><span className="hidden sm:inline">フィルタを保存</span></button>}
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

      <div className="flex items-center justify-end mb-4">
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
                engineProfiles={engineProfiles}
                isHighlighted={highlightedAnchor === anchorId}
                onOpenLog={onOpenLog}
                onRunReview={onRunReview}
                onSelectReport={onSelectReport}
                onSelectCard={handleSelectCard}
              />
            );
          })}
        </div>
      )}
      </main>
    </div>
  );
}
