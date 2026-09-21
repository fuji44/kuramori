import React, { useMemo } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Clock,
  Settings,
  User,
  Search,
  Filter,
  Layers,
  FileCode,
  Tag,
  AlertTriangle,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ShieldAlert,
  Flame,
  CheckCircle2,
  HelpCircle,
  Bookmark,
  Trash2,
} from 'lucide-react';
import type { ReviewReportData, ReviewComment, Severity, LensVerdict } from '@review-base/core';

export type MarkType = 'post' | 'hold' | 'skip';

export interface FilterState {
  mustReviewOnly: boolean; // 必須確認 (要検証・採用・P1 で未skip)
  query: string;
  file: string;
  tags: string[];
  severities: Severity[]; // 複数選択 (空なら全件)
  categories: string[]; // 複数選択 (空なら全件)
  lensVerdicts: LensVerdict[]; // 複数選択 (空なら全件)
  verify: 'all' | 'isolated' | 'triangulated';
  mark: 'all' | MarkType | 'unset';
}

interface ReviewSidebarProps {
  data: ReviewReportData;
  marks: Record<string, MarkType>;
  memos: Record<string, string>;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onClearMarks?: () => void;
  onSelectComment: (commentId: string) => void;
  activeCommentId?: string;
  onOpenExport: () => void;
  onOpenJson?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TAG_ORDER = ['MUST', 'Q', 'IMO', 'NIT', 'NR', 'FYI', 'PRAISE', 'THOUGHT'];

export const ReviewSidebar: React.FC<ReviewSidebarProps> = ({
  data,
  marks,
  memos,
  filters,
  onFilterChange,
  onResetFilters,
  onClearMarks,
  onSelectComment,
  activeCommentId,
  onOpenExport,
  onOpenJson,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [copiedNumber, setCopiedNumber] = React.useState<boolean>(false);

  const pr = data.pr;
  const comments = data.comments;

  // アクティブなフィルタが存在するか
  const hasActiveFilters = useMemo(() => {
    return (
      filters.mustReviewOnly ||
      Boolean(filters.query) ||
      filters.file !== 'all' ||
      filters.severities.length > 0 ||
      filters.categories.length > 0 ||
      filters.lensVerdicts.length > 0 ||
      filters.tags.length > 0 ||
      filters.mark !== 'all'
    );
  }, [filters]);

  // 進捗集計
  const progress = useMemo(() => {
    let post = 0;
    let hold = 0;
    let skip = 0;
    let unset = 0;

    for (const c of comments) {
      const m = marks[c.id];
      if (m === 'post') post++;
      else if (m === 'hold') hold++;
      else if (m === 'skip') skip++;
      else unset++;
    }

    const total = comments.length;
    const postPct = total > 0 ? (post / total) * 100 : 0;
    const holdPct = total > 0 ? (hold / total) * 100 : 0;
    const skipPct = total > 0 ? (skip / total) * 100 : 0;

    return { post, hold, skip, unset, total, postPct, holdPct, skipPct };
  }, [comments, marks]);

  // 必須確認（要検証・採用・P1 で未見送り）の集計
  const mustReviewCount = useMemo(() => {
    let count = 0;
    for (const c of comments) {
      const isTarget = c.lens?.verdict === 'escalate' || c.lens?.verdict === 'promote' || c.severity === 'P1';
      const isNotSkipped = marks[c.id] !== 'skip';
      if (isTarget && isNotSkipped) count++;
    }
    return count;
  }, [comments, marks]);

  // 重大度 (Severity) 集計
  const severityCounts = useMemo(() => {
    const map: Record<string, number> = { P1: 0, P2: 0, P3: 0 };
    for (const c of comments) {
      if (c.severity && map[c.severity] !== undefined) {
        map[c.severity]++;
      }
    }
    return map;
  }, [comments]);

  // 判定 (Lens Verdict) 集計
  const lensCounts = useMemo(() => {
    const map: Record<string, number> = { escalate: 0, promote: 0, keep: 0, drop: 0 };
    for (const c of comments) {
      if (c.lens?.verdict && map[c.lens.verdict] !== undefined) {
        map[c.lens.verdict]++;
      }
    }
    return map;
  }, [comments]);

  // カテゴリ (Category) 集計
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of comments) {
      if (c.category) {
        map.set(c.category, (map.get(c.category) || 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [comments]);

  // ファイルオプション
  const fileOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of comments) {
      if (c.path) {
        map.set(c.path, (map.get(c.path) || 0) + 1);
      }
    }
    const list = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return list;
  }, [comments]);

  // タグ集計
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of comments) {
      if (c.tag) {
        map.set(c.tag, (map.get(c.tag) || 0) + 1);
      }
    }
    return map;
  }, [comments]);

  // PR番号コピー
  const handleCopyPrNumber = async () => {
    if (!pr?.number) return;
    try {
      await navigator.clipboard.writeText(`#${pr.number}`);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch {}
  };

  // タグ選択トグル
  const handleToggleTag = (tag: string) => {
    const current = filters.tags;
    if (current.includes(tag)) {
      onFilterChange({ tags: current.filter((t) => t !== tag) });
    } else {
      onFilterChange({ tags: [...current, tag] });
    }
  };

  // 重大度選択トグル
  const handleToggleSeverity = (sev: Severity) => {
    const current = filters.severities;
    if (current.includes(sev)) {
      onFilterChange({ severities: current.filter((s) => s !== sev), mustReviewOnly: false });
    } else {
      onFilterChange({ severities: [...current, sev], mustReviewOnly: false });
    }
  };

  // 一次判定選択トグル
  const handleToggleLensVerdict = (lens: LensVerdict) => {
    const current = filters.lensVerdicts;
    if (current.includes(lens)) {
      onFilterChange({ lensVerdicts: current.filter((l) => l !== lens), mustReviewOnly: false });
    } else {
      onFilterChange({ lensVerdicts: [...current, lens], mustReviewOnly: false });
    }
  };

  // カテゴリ選択トグル
  const handleToggleCategory = (cat: string) => {
    const current = filters.categories;
    if (current.includes(cat)) {
      onFilterChange({ categories: current.filter((c) => c !== cat), mustReviewOnly: false });
    } else {
      onFilterChange({ categories: [...current, cat], mustReviewOnly: false });
    }
  };

  if (isCollapsed) {
    return (
      <aside className="w-13 shrink-0 h-full bg-[#161b22] border-r border-[#30363d] py-3.5 px-2 flex flex-col items-center justify-between text-gray-400 select-none z-20">
        {/* 上部: 展開ボタン & PR番号 & クイックアクション */}
        <div className="flex flex-col items-center gap-3 w-full">
          {/* サイドバー展開ボタン */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title="サイドバーを展開"
            className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 hover:text-white transition-colors border border-[#30363d] shadow-sm"
          >
            <PanelLeftOpen className="w-4 h-4 text-[#00AFA8]" />
          </button>

          {/* PR 番号（正対したコンパクトな縦積みバッジ） */}
          {pr?.url ? (
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              title={`PR #${pr.number ?? '0'}: ${pr.title ?? ''} (GitHub で開く)`}
              className="px-1.5 py-1 rounded-md bg-[#0d1117] hover:bg-[#21262d] text-gray-300 hover:text-[#00AFA8] border border-[#30363d] font-mono font-bold text-[10px] text-center transition-colors flex flex-col items-center leading-tight"
            >
              <span className="text-[9px] text-gray-500">PR</span>
              <span>#{pr.number ?? '0'}</span>
            </a>
          ) : (
            <div
              title={`PR #${pr?.number ?? '0'}`}
              className="px-1.5 py-1 rounded-md bg-[#0d1117] text-gray-300 border border-[#30363d] font-mono font-bold text-[10px] text-center flex flex-col items-center leading-tight"
            >
              <span className="text-[9px] text-gray-500">PR</span>
              <span>#{pr?.number ?? '0'}</span>
            </div>
          )}

          <div className="w-6 h-px bg-[#30363d]/80 my-0.5" />

          {/* 必須確認（ショートカット）トグル */}
          <button
            type="button"
            onClick={() => {
              if (filters.mustReviewOnly) {
                onFilterChange({ mustReviewOnly: false, severities: [], lensVerdicts: [] });
              } else {
                onFilterChange({
                  mustReviewOnly: true,
                  severities: ['P1'],
                  lensVerdicts: ['escalate', 'promote'],
                  mark: 'all',
                });
              }
            }}
            title={`必ず確認 (${mustReviewCount}件)`}
            className={`p-2 rounded-lg transition-all relative border ${
              filters.mustReviewOnly
                ? 'bg-[#00AFA8]/20 text-[#00AFA8] border-[#00AFA8]/50 shadow-sm'
                : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#21262d] border-[#30363d]'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${filters.mustReviewOnly ? 'text-[#00AFA8]' : 'text-amber-400'}`} />
            {mustReviewCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#00AFA8] text-black font-mono font-bold text-[9px] flex items-center justify-center">
                {mustReviewCount}
              </span>
            )}
          </button>

          {/* フィルタ全解除ボタン（絞り込み有効時のみ） */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              title="フィルタ全解除"
              className="p-2 rounded-lg bg-[#0d1117] hover:bg-[#21262d] text-gray-400 hover:text-[#00AFA8] border border-[#30363d] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 中央: 進捗ミニバー */}
        <div
          className="flex flex-col items-center gap-1.5 w-full my-auto py-3 cursor-default"
          title={`進捗: 投稿 ${progress.post} / 保留 ${progress.hold} / 不投稿 ${progress.skip} (未選択 ${progress.unset})`}
        >
          {/* 縦型プログレスバー */}
          <div className="w-1.5 h-20 rounded-full bg-[#0d1117] overflow-hidden flex flex-col border border-[#30363d]/50">
            <div style={{ height: `${progress.postPct}%` }} className="bg-[#00AFA8] transition-all" />
            <div style={{ height: `${progress.holdPct}%` }} className="bg-amber-400 transition-all" />
            <div style={{ height: `${progress.skipPct}%` }} className="bg-gray-600 transition-all" />
          </div>
          <span className="text-[9px] font-mono font-bold text-gray-400">
            {progress.post + progress.hold + progress.skip}/{progress.total}
          </span>
        </div>

        {/* 下部: 判断書き出し & 判定バッジ */}
        <div className="flex flex-col items-center gap-2.5 w-full">
          {/* 判断書き出しボタン */}
          <button
            type="button"
            onClick={onOpenExport}
            title="判断を書き出す"
            className="p-2 rounded-lg bg-[#ECEDF0] hover:bg-white text-black transition-all shadow-md active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>

          {/* 全体判定バッジ */}
          <span
            title={`全体判定: ${data.verdict}`}
            className={`w-3 h-3 rounded-full border shadow-sm ${
              data.verdict === 'APPROVE'
                ? 'bg-emerald-400 border-emerald-500 shadow-emerald-500/50'
                : 'bg-amber-400 border-amber-500 shadow-amber-500/50'
            }`}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[300px] shrink-0 h-full overflow-y-auto bg-[#161b22] border-r border-[#30363d] p-5 pb-16 flex flex-col gap-6 text-sm text-gray-200 select-none scrollbar-thin transition-all">
      {/* 1. ヘッダー情報 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-wider uppercase text-gray-400 font-semibold">
            AI Code Review
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {data.verdict}
            </span>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="サイドバーを閉じる"
                className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-[#21262d] transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight font-mono text-gray-100">
            #{pr?.number ?? '0'}
          </span>
          <span className="text-xs text-gray-400 truncate flex-1">
            {pr?.repo ?? ''}
          </span>
          <button
            type="button"
            onClick={handleCopyPrNumber}
            title="PR番号をコピー"
            className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-[#21262d] transition-colors"
          >
            {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {pr?.url && (
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              title="GitHub PR を開く"
              className="p-1 rounded text-gray-400 hover:text-[#00AFA8] hover:bg-[#21262d] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#21262d] text-[10.5px] font-semibold text-gray-400">
            <Clock className="w-3 h-3" />
            <span>第 1 回</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#21262d] text-[10.5px] font-semibold text-gray-400">
            <Settings className="w-3 h-3" />
            <span>interactive</span>
          </span>
          {pr?.author && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#21262d] text-[10.5px] font-semibold text-gray-400">
              <User className="w-3 h-3" />
              <span>{pr.author}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Story Issue リンク */}
      {pr?.storyUrl && (
        <div className="flex flex-col gap-2 border-t border-[#30363d]/70 pt-4">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">STORY</span>
          <a
            href={pr.storyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#282e36] text-xs font-mono font-semibold text-[#00AFA8] transition-colors"
          >
            <span>#{pr.storyUrl.split('/').pop()}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      )}

      {/* 3. 判定の進捗（精査ボード） */}
      <div className="flex flex-col gap-2.5 border-t border-[#30363d]/70 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">判定の進捗</span>
          <span className="text-xs font-mono font-semibold text-gray-300">
            {progress.post + progress.hold + progress.skip} / {progress.total}
          </span>
        </div>

        {/* 3色プログレスバー */}
        <div className="h-2 w-full rounded-full bg-[#21262d] overflow-hidden flex">
          <div style={{ width: `${progress.postPct}%` }} className="bg-[#00AFA8] transition-all" title={`投稿: ${progress.post}`} />
          <div style={{ width: `${progress.holdPct}%` }} className="bg-amber-400 transition-all" title={`保留: ${progress.hold}`} />
          <div style={{ width: `${progress.skipPct}%` }} className="bg-gray-500 transition-all" title={`不投稿: ${progress.skip}`} />
        </div>

        {/* 4行進捗リスト */}
        <div className="flex flex-col gap-1.5 text-xs pt-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-[#00AFA8]" />
              <span>投稿する</span>
            </span>
            <span className="font-mono font-bold text-gray-200">{progress.post}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>保留</span>
            </span>
            <span className="font-mono font-bold text-gray-200">{progress.hold}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              <span>投稿しない</span>
            </span>
            <span className="font-mono font-bold text-gray-200">{progress.skip}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-400">
              <span className="w-2 h-2 rounded-full border border-gray-500" />
              <span>未選択</span>
            </span>
            <span className="font-mono font-bold text-gray-400">{progress.unset}</span>
          </div>
        </div>
      </div>

      {/* 4. 優先ショートカット (Quick Shortcuts) */}
      <div className="flex flex-col gap-2.5 border-t border-[#30363d]/70 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">優先ショートカット</span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[10.5px] text-[#00AFA8] hover:underline font-semibold flex items-center gap-1 transition-colors"
              title="すべての絞り込み条件をリセット"
            >
              <RotateCcw className="w-3 h-3" />
              <span>フィルタ全解除</span>
            </button>
          ) : (
            <span className="text-[10px] text-gray-500">一括絞り込み</span>
          )}
        </div>

        {/* 必須確認ボタン（最重要・最優先ボタン） */}
        <button
          type="button"
          onClick={() => {
            if (filters.mustReviewOnly) {
              onFilterChange({
                mustReviewOnly: false,
                severities: [],
                lensVerdicts: [],
              });
            } else {
              onFilterChange({
                mustReviewOnly: true,
                severities: ['P1'],
                lensVerdicts: ['escalate', 'promote'],
                mark: 'all',
              });
            }
          }}
          className={`w-full p-2.5 rounded-lg text-xs transition-all border flex flex-col gap-1 text-left ${
            filters.mustReviewOnly
              ? 'bg-[#00AFA8]/15 text-[#00AFA8] border-[#00AFA8]/50 shadow-sm'
              : 'bg-[#0d1117] text-gray-300 hover:text-white hover:bg-[#161b22] border-[#30363d]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className={`w-3.5 h-3.5 ${filters.mustReviewOnly ? 'text-[#00AFA8]' : 'text-amber-400'}`} />
              <span>必ず確認（必須レビュー）</span>
            </div>
            <span
              className={`font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                filters.mustReviewOnly
                  ? 'bg-[#00AFA8]/25 text-[#00AFA8] border border-[#00AFA8]/40'
                  : 'bg-[#161b22] text-gray-400 border border-[#30363d]'
              }`}
            >
              {mustReviewCount} 件
            </span>
          </div>
          <span className="text-[10.5px] text-gray-400 leading-tight">
            P1・要検証・採用（未見送り）をまとめて確認
          </span>
        </button>

        {/* フィルタ組み合わせショートカット（一発セットボタン群） */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                mustReviewOnly: false,
                lensVerdicts: ['escalate'],
                severities: [],
                mark: 'all',
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border text-left flex items-center justify-between ${
              !filters.mustReviewOnly &&
              filters.lensVerdicts.length === 1 &&
              filters.lensVerdicts[0] === 'escalate' &&
              filters.severities.length === 0
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-semibold'
                : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
            }`}
          >
            <span>要検証のみ</span>
            <span className="font-mono text-[10.5px] opacity-75">{lensCounts.escalate}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onFilterChange({
                mustReviewOnly: false,
                lensVerdicts: ['promote'],
                severities: [],
                mark: 'all',
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border text-left flex items-center justify-between ${
              !filters.mustReviewOnly &&
              filters.lensVerdicts.length === 1 &&
              filters.lensVerdicts[0] === 'promote' &&
              filters.severities.length === 0
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 font-semibold'
                : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
            }`}
          >
            <span>採用のみ</span>
            <span className="font-mono text-[10.5px] opacity-75">{lensCounts.promote}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onFilterChange({
                mustReviewOnly: false,
                severities: ['P1'],
                lensVerdicts: [],
                mark: 'all',
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border text-left flex items-center justify-between ${
              !filters.mustReviewOnly &&
              filters.severities.length === 1 &&
              filters.severities[0] === 'P1' &&
              filters.lensVerdicts.length === 0
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-semibold'
                : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
            }`}
          >
            <span>P1 重大のみ</span>
            <span className="font-mono text-[10.5px] opacity-75">{severityCounts.P1}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onFilterChange({
                mustReviewOnly: false,
                mark: 'unset',
                lensVerdicts: [],
                severities: [],
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border text-left flex items-center justify-between ${
              !filters.mustReviewOnly && filters.mark === 'unset'
                ? 'bg-gray-500/15 text-gray-200 border-gray-500/40 font-semibold'
                : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
            }`}
          >
            <span>未判断のみ</span>
            <span className="font-mono text-[10.5px] opacity-75">{progress.unset}</span>
          </button>
        </div>
      </div>

      {/* 5. 語句で絞る */}
      <div className="flex flex-col gap-2 border-t border-[#30363d]/70 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">語句で絞る</span>
          {filters.query && (
            <button
              type="button"
              onClick={() => onFilterChange({ query: '' })}
              className="text-[10.5px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              解除
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onFilterChange({ query: e.target.value })}
            placeholder="要約・本文・パス"
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00AFA8] transition-colors"
          />
        </div>
      </div>

      {/* 6. 重大度 (Severity) で絞る - 複数トグル選択 */}
      <div className="flex flex-col gap-2 border-t border-[#30363d]/70 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">重大度で絞る</span>
          {filters.severities.length > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange({ severities: [], mustReviewOnly: false })}
              className="text-[10.5px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              解除
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'P1' as const, label: 'P1', count: severityCounts.P1, activeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-semibold' },
            { id: 'P2' as const, label: 'P2', count: severityCounts.P2, activeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold' },
            { id: 'P3' as const, label: 'P3', count: severityCounts.P3, activeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/40 font-semibold' },
          ].map((s) => {
            const active = filters.severities.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleToggleSeverity(s.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-all border flex items-center justify-center gap-1.5 ${
                  active
                    ? `${s.activeBg} shadow-sm`
                    : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
                }`}
              >
                <span>{s.label}</span>
                <span className="text-[10.5px] opacity-75">({s.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. 一次判定 (Lens) で絞る - 複数トグル選択 */}
      <div className="flex flex-col gap-2 border-t border-[#30363d]/70 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">一次判定 (Lens) で絞る</span>
          {filters.lensVerdicts.length > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange({ lensVerdicts: [], mustReviewOnly: false })}
              className="text-[10.5px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              解除
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {[
            { id: 'escalate' as const, label: '要検証 (escalate)', count: lensCounts.escalate, activeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-semibold' },
            { id: 'promote' as const, label: '採用 (promote)', count: lensCounts.promote, activeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/40 font-semibold' },
            { id: 'keep' as const, label: '維持 (keep)', count: lensCounts.keep, activeBg: 'bg-gray-500/15 text-gray-200 border-gray-500/40 font-semibold' },
            { id: 'drop' as const, label: '見送り (drop)', count: lensCounts.drop, activeBg: 'bg-gray-700/25 text-gray-400 border-gray-600/40 font-semibold' },
          ].map((l) => {
            const active = filters.lensVerdicts.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => handleToggleLensVerdict(l.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border flex items-center justify-between ${
                  active
                    ? `${l.activeBg} shadow-sm`
                    : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
                }`}
              >
                <span>{l.label}</span>
                <span className="font-mono text-[10.5px] opacity-75">{l.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 8. カテゴリ (Category) で絞る - チップ形式 & 複数選択 */}
      {categoryCounts.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#30363d]/70 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 tracking-wider">カテゴリで絞る</span>
            {filters.categories.length > 0 && (
              <button
                type="button"
                onClick={() => onFilterChange({ categories: [] })}
                className="text-[10.5px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                解除
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categoryCounts.map(([cat, count]) => {
              const active = filters.categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleToggleCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                    active
                      ? 'bg-[#00AFA8]/15 text-[#00AFA8] border-[#00AFA8]/40 font-semibold shadow-sm'
                      : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. ファイルで絞る */}
      {fileOptions.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#30363d]/70 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 tracking-wider">ファイルで絞る</span>
            {filters.file !== 'all' && (
              <button
                type="button"
                onClick={() => onFilterChange({ file: 'all' })}
                className="text-[10.5px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                解除
              </button>
            )}
          </div>
          <select
            value={filters.file}
            onChange={(e) => onFilterChange({ file: e.target.value })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#00AFA8] transition-colors truncate"
          >
            <option value="all">全ファイル ({comments.length})</option>
            {fileOptions.map(([f, count]) => (
              <option key={f} value={f}>
                {f.split('/').pop()} ({count})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 10. タグで絞る */}
      <div className="flex flex-col gap-2 border-t border-[#30363d]/70 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">タグで絞る</span>
          {filters.tags.length > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange({ tags: [] })}
              className="text-[10.5px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              解除
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TAG_ORDER.map((tag) => {
            const count = tagCounts.get(tag) || 0;
            if (count === 0) return null;
            const active = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggleTag(tag)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                  active
                    ? 'bg-[#00AFA8]/15 text-[#00AFA8] border-[#00AFA8]/40 font-semibold shadow-sm'
                    : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
                }`}
              >
                <span>{tag}</span>
                <span className="text-[10px] opacity-75 font-mono">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 11. 判定マークで絞る */}
      <div className="flex flex-col gap-2 border-t border-[#30363d]/70 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">マークで絞る</span>
          {filters.mark !== 'all' && (
            <button
              type="button"
              onClick={() => onFilterChange({ mark: 'all' })}
              className="text-[10.5px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              解除
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'all', label: 'すべて', activeBg: 'bg-[#00AFA8]/15 text-[#00AFA8] border-[#00AFA8]/40 font-semibold' },
            { id: 'post', label: '投稿する', activeBg: 'bg-[#00AFA8]/15 text-[#00AFA8] border-[#00AFA8]/40 font-semibold' },
            { id: 'hold', label: '保留', activeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold' },
            { id: 'skip', label: '投稿しない', activeBg: 'bg-gray-700/25 text-gray-400 border-gray-600/40 font-semibold' },
            { id: 'unset', label: '未選択', activeBg: 'bg-gray-500/15 text-gray-200 border-gray-500/40 font-semibold' },
          ].map((m) => {
            const active = filters.mark === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onFilterChange({ mark: m.id as any })}
                className={`px-2.5 py-1.5 rounded-lg text-xs text-center transition-all border flex items-center justify-center ${
                  active
                    ? `${m.activeBg} shadow-sm`
                    : 'bg-[#0d1117] text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-[#30363d]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 10. 最下部アクション */}
      <div className="flex flex-col gap-2 pt-4 mt-auto">
        <button
          type="button"
          onClick={onOpenExport}
          className="w-full h-10 rounded-xl bg-[#ECEDF0] hover:bg-white text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <span>判断を書き出す</span>
        </button>
        {onClearMarks && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('すべての指摘の判断（投稿・保留・投稿しない）とメモをクリアしますか？')) {
                onClearMarks();
              }
            }}
            className="w-full h-8 rounded-lg bg-transparent hover:bg-[#21262d] text-gray-400 hover:text-rose-400 text-xs flex items-center justify-center gap-1.5 transition-colors border border-transparent hover:border-rose-500/30"
            title="すべての指摘の判断（投稿・保留・投稿しない）とメモを初期化"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>判断をクリア</span>
          </button>
        )}
      </div>
    </aside>
  );
};
