import React, { useState, useRef } from 'react';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  X,
  AlertTriangle,
  GitCommit,
  Layers,
  FileCode,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  PanelLeftOpen,
  Sparkles,
  Info,
  Flame,
  HelpCircle,
} from 'lucide-react';
import type { ReviewReportData, ReviewComment, MarkType } from '@kuramori/core';
import { ReviewDiagram } from './ReviewDiagram.tsx';
import { ReviewDiffViewer } from './ReviewDiffViewer.tsx';
import { ReviewOutlineBar } from './ReviewOutlineBar.tsx';

interface ReviewMainContentProps {
  data: ReviewReportData;
  comments: ReviewComment[];
  marks: Record<string, MarkType>;
  memos: Record<string, string>;
  onMarkChange: (commentId: string, mark: MarkType) => void;
  onMemoChange: (commentId: string, memo: string) => void;
  onBulkMark: (mark: MarkType) => void;
  onSelectComment: (commentId: string) => void;
  activeCommentId?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenJson?: () => void;
}

const TAG_META: Record<string, { bg: string; text: string; meaning: string }> = {
  MUST: { bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30', text: 'text-rose-400', meaning: '必ず修正してほしい' },
  Q: { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', text: 'text-amber-400', meaning: '回答が必要' },
  IMO: { bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30', text: 'text-blue-400', meaning: 'より良い代替案の提示' },
  NIT: { bg: 'bg-gray-500/15 text-gray-400 border-gray-500/30', text: 'text-gray-400', meaning: '重箱の隅' },
  NR: { bg: 'bg-gray-500/15 text-gray-400 border-gray-500/30', text: 'text-gray-400', meaning: '余力があれば' },
  FYI: { bg: 'bg-gray-500/15 text-gray-400 border-gray-500/30', text: 'text-gray-400', meaning: '情報の共有' },
  PRAISE: { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', text: 'text-emerald-400', meaning: '良いコードへの称賛' },
  THOUGHT: { bg: 'bg-gray-500/15 text-gray-400 border-gray-500/30', text: 'text-gray-400', meaning: '観点の共有' },
};

const SEVERITY_META: Record<string, { label: string; badge: string }> = {
  P1: { label: 'P1 Blocker', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  P2: { label: 'P2 Warning', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  P3: { label: 'P3 Note', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
};

const CATEGORY_META: Record<string, { label: string; bg: string }> = {
  bug: { label: 'Bug', bg: 'bg-rose-950/40 text-rose-300 border-rose-500/30' },
  spec: { label: 'Spec', bg: 'bg-purple-950/40 text-purple-300 border-purple-500/30' },
  convention: { label: 'Convention', bg: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30' },
  security: { label: 'Security', bg: 'bg-red-950/50 text-red-300 border-red-500/40' },
  architecture: { label: 'Architecture', bg: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30' },
  performance: { label: 'Performance', bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' },
};

const LENS_META: Record<string, { label: string; desc: string; color: string }> = {
  escalate: { label: '要検証 (escalate)', desc: 'この表で決められない。人間が最初に検証・判断する', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  promote: { label: '採用 (promote)', desc: '必ず言う', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  keep: { label: '維持 (keep)', desc: '出すが優先度は低い', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
  drop: { label: '見送り (drop)', desc: '言わない（消さず畳む）', color: 'text-gray-500 bg-gray-500/5 border-gray-700' },
};

export const ReviewMainContent: React.FC<ReviewMainContentProps> = ({
  data,
  comments,
  marks,
  memos,
  onMarkChange,
  onMemoChange,
  onBulkMark,
  onSelectComment,
  activeCommentId,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenJson,
}) => {
  const mainRef = useRef<HTMLElement>(null);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [showChangedCode, setShowChangedCode] = useState<boolean>(true);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const top = e.currentTarget.scrollTop;
    if (top > 60 && !isScrolled) {
      setIsScrolled(true);
    } else if (top <= 60 && isScrolled) {
      setIsScrolled(false);
    }
  };

  const pr = data.pr;
  const summary = data.summary;
  const brief = typeof summary.brief === 'string'
    ? { problem: summary.brief, approach: '', blastRadius: summary.blastRadius ?? '' }
    : {
        problem: summary.brief?.problem ?? '',
        approach: summary.brief?.approach ?? '',
        blastRadius: summary.brief?.blastRadius ?? summary.blastRadius ?? '',
      };

  const handleToggleCard = (id: string) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const c of comments) {
      next[c.id] = open;
    }
    setOpenMap(next);
  };

  const allOpened = comments.length > 0 && comments.every((c) => openMap[c.id] !== false);

  // located と global に分類
  const locatedComments = comments.filter((c) => Boolean(c.path));
  const globalComments = comments.filter((c) => !c.path);

  // GitHub パーマリンク生成
  const getFileUrl = (comment: ReviewComment) => {
    if (comment.location?.url) return comment.location.url;
    if (pr?.repo && comment.path) {
      const sha = pr.headSha || 'main';
      const line = comment.line ?? comment.location?.origin?.line ?? 1;
      return `https://github.com/${pr.repo}/blob/${sha}/${comment.path}#L${line}`;
    }
    return null;
  };

  return (
    <main
      ref={mainRef}
      onScroll={handleScroll}
      className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden text-gray-200 select-text scrollbar-thin relative"
    >
      {/* スクロール時に縮小スティッチするコンパクトPRバー */}
      <div
        className={`sticky top-0 z-30 w-full px-6 lg:px-12 transition-all duration-150 border-b flex items-center justify-between gap-4 ${
          isScrolled
            ? 'h-12 bg-[#0d1117]/95 backdrop-blur-md border-[#30363d] opacity-100 shadow-md pointer-events-auto'
            : 'h-0 opacity-0 pointer-events-none border-transparent overflow-hidden'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isSidebarCollapsed && onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              title="サイドバーを展開"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] text-xs transition-colors shrink-0"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-[#00AFA8]" />
              <span className="text-[11px]">サイドバー</span>
            </button>
          )}
          <span className="font-mono text-xs font-bold text-[#00AFA8] shrink-0">
            #{pr?.number ?? '0'}
          </span>
          <span className="text-xs font-semibold text-gray-100 truncate">
            {pr?.title ?? 'Review Report'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-gray-400">
          {onOpenJson && (
            <button
              type="button"
              onClick={onOpenJson}
              title="レビュー結果 JSON を表示"
              className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-[#00AFA8] border border-[#30363d] transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="hidden sm:inline text-[11px] text-gray-400">
            {pr?.repo}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            {data.verdict}
          </span>
        </div>
      </div>

      {/* 本文左サイド: Notion風アウトラインバー (画面縦中央に完全固定・追従) */}
      <aside
        className={`hidden sm:block fixed top-1/2 -translate-y-1/2 z-20 transition-all duration-200 ${
          isSidebarCollapsed ? 'left-[62px]' : 'left-[310px]'
        }`}
      >
        <ReviewOutlineBar
          comments={comments}
          marks={marks}
          activeCommentId={activeCommentId}
          onSelectComment={onSelectComment}
          scrollContainerRef={mainRef}
        />
      </aside>

      <div className="relative min-h-full overflow-x-hidden">
        {/* メインコンテンツ本体（左右パディングと上下マージン） */}
        <div className="pl-14 pr-5 sm:pl-16 sm:pr-8 lg:pl-18 lg:pr-12 pt-6 pb-32 flex flex-col gap-10">
        {/* 1. PR ヘッダー */}
        <header className="flex flex-col gap-3 w-full">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              {isSidebarCollapsed && onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  title="サイドバーを展開"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] text-xs font-sans transition-colors mr-1"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5 text-[#00AFA8]" />
                  <span>サイドバー</span>
                </button>
              )}
              <span className="w-2 h-2 rounded-full bg-[#00AFA8]" />
              <span>
                {pr?.repo ?? ''} · PR #{pr?.number ?? '0'} · {pr?.author ?? ''}
              </span>
            </div>
          </div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-100 leading-snug flex-1 min-w-[280px]">
            {pr?.title ?? 'Review Report'}
          </h1>
          {onOpenJson && (
            <button
              type="button"
              onClick={onOpenJson}
              title="レビュー結果 JSON を表示"
              className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-[#00AFA8] border border-[#30363d] transition-all shrink-0 mt-0.5 shadow-sm"
            >
              <FileCode className="w-4 h-4" />
            </button>
          )}
        </div>
        {pr?.headSha && (
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <GitCommit className="w-3.5 h-3.5" />
            <span>head {pr.headSha.slice(0, 7)}</span>
          </div>
        )}
        <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] text-xs leading-relaxed text-gray-400">
          ※ タグや判定は一次レビューの候補です。左ペインの精査ボードまたは各指摘のカードで投稿・保留を確定させてください。
        </div>
      </header>

      {/* 2. 要約セクション（3つの文章） */}
      <section className="flex flex-col gap-3 w-full">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">要約</h2>
        <div className="flex flex-col rounded-2xl bg-[#161b22] border border-[#30363d] overflow-hidden divide-y divide-[#30363d]/80">
          {/* 問題点 */}
          <div className="p-5 flex gap-4 items-start">
            <div className="flex items-center gap-2 min-w-[120px] pt-0.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-bold text-gray-300">何が問題か</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-200 flex-1">
              {brief.problem || '明示された問題点はありません。'}
            </p>
          </div>

          {/* 直し方 */}
          <div className="p-5 flex gap-4 items-start">
            <div className="flex items-center gap-2 min-w-[120px] pt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#00AFA8]" />
              <span className="text-xs font-bold text-gray-300">どう直したか</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-200 flex-1">
              {brief.approach || '変更の詳細なアプローチは記載されていません。'}
            </p>
          </div>

          {/* 変わらない範囲 */}
          <div className="p-5 flex gap-4 items-start bg-emerald-500/[0.03]">
            <div className="flex items-center gap-2 min-w-[120px] pt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">何が変わらないか</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-300 flex-1">
              {brief.blastRadius || '明示された免責範囲はありません。'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. 図でつかむ（3種類の図） */}
      <section className="flex flex-col gap-5 w-full">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">図でつかむ</h2>
          <span className="text-xs text-gray-400">変更の構造と波及経路を視覚化</span>
        </div>

        {/* 図 1: 影響範囲・システム関連図 (D2) */}
        {data.diagram && (
          <ReviewDiagram
            diagram={data.diagram}
            comments={comments}
            onSelectNode={onSelectComment}
          />
        )}

        {/* 図 2: 条件分岐・メカニズム (Mechanism) */}
        {summary.mechanism && (
          <figure className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-sm space-y-4 m-0">
            <div className="flex items-center justify-between border-b border-[#30363d]/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400">
                  判定メカニズム
                </span>
                <span className="text-sm font-semibold text-gray-100">
                  因果連鎖と発動条件 (Mechanism)
                </span>
              </div>
            </div>

            {/* 不具合成立の因果連鎖 (Why) */}
            {summary.mechanism.why && (
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs leading-relaxed space-y-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  不具合が成立していた因果連鎖 (Why):
                </span>
                {Array.isArray(summary.mechanism.why) ? (
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-gray-300">
                    {summary.mechanism.why.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-gray-300 whitespace-pre-wrap">{summary.mechanism.why}</p>
                )}
              </div>
            )}

            {/* 発動条件 (Conditions) */}
            {summary.mechanism.conditions && summary.mechanism.conditions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">変更が発動する条件 (Conditions):</span>
                <div className="flex flex-wrap gap-2">
                  {summary.mechanism.conditions.map((cond, idx) => (
                    <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-[#0d1117] border border-cyan-500/30 text-xs flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span className="text-cyan-200 font-mono text-[11.5px]">{cond}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 修正の居場所 (whereTheFixSits) & 不変条件 (unchanged) */}
            {(summary.mechanism.whereTheFixSits || summary.mechanism.unchanged) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {summary.mechanism.whereTheFixSits && (
                  <div className="p-3 rounded-xl bg-[#0d1117] border border-indigo-500/30 text-xs flex flex-col gap-1">
                    <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      修正の居場所:
                    </span>
                    <p className="text-gray-200 leading-relaxed font-mono text-[11px]">
                      {summary.mechanism.whereTheFixSits}
                    </p>
                  </div>
                )}
                {summary.mechanism.unchanged && (
                  <div className="p-3 rounded-xl bg-[#0d1117] border border-emerald-500/30 text-xs flex flex-col gap-1">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      不変条件 (何が変わらないか):
                    </span>
                    <p className="text-emerald-200/90 leading-relaxed font-mono text-[11px]">
                      {summary.mechanism.unchanged}
                    </p>
                  </div>
                )}
              </div>
            )}
          </figure>
        )}

        {/* 図 3: 処理フロー・呼び出し順 (CallFlow) */}
        {data.callFlow && data.callFlow.steps && data.callFlow.steps.length > 0 && (
          <figure className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-sm space-y-4 m-0">
            <div className="flex items-center justify-between border-b border-[#30363d]/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400">
                  処理順序
                </span>
                <span className="text-sm font-semibold text-gray-100">
                  処理シーケンス ({data.callFlow.steps.length} ステップ)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {data.callFlow.steps.map((st) => (
                <div
                  key={st.step}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[#0d1117] border border-[#30363d]"
                >
                  <span className="w-6 h-6 rounded-full bg-[#21262d] border border-[#30363d] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 text-gray-300">
                    {st.step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-200">{st.title}</span>
                      {st.commentId && (
                        <button
                          type="button"
                          onClick={() => onSelectComment(st.commentId!)}
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#00AFA8]/15 text-[#00AFA8] hover:bg-[#00AFA8]/30"
                        >
                          {st.commentId}
                        </button>
                      )}
                    </div>
                    {st.description && (
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{st.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </figure>
        )}
      </section>

      {/* 4. この PR の情報（メタデータグリッド） */}
      <section className="flex flex-col gap-3 w-full">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">この PR の情報</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#30363d] border border-[#30363d] rounded-2xl overflow-hidden">
          <div className="bg-[#161b22] p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Base</span>
            <span className="text-xs font-mono font-bold text-gray-200 truncate">{pr?.baseRef ?? 'main'}</span>
          </div>
          <div className="bg-[#161b22] p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Author</span>
            <span className="text-xs font-bold text-gray-200 truncate">{pr?.author ?? 'unknown'}</span>
          </div>
          <div className="bg-[#161b22] p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Head SHA</span>
            <span className="text-xs font-mono font-bold text-gray-200">{pr?.headSha?.slice(0, 7) ?? '-'}</span>
          </div>
          <div className="bg-[#161b22] p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">変更ファイル数</span>
            <span className="text-sm font-mono font-bold text-gray-200">{data.metrics?.filesAnalyzed ?? '-'}</span>
          </div>
          <div className="bg-[#161b22] p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">指摘件数</span>
            <span className="text-sm font-mono font-bold text-gray-200">{data.comments.length}</span>
          </div>
          <div className="bg-[#161b22] p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">P1 / P2 / P3</span>
            <span className="text-xs font-mono font-bold text-gray-200">
              {data.metrics?.p1Count ?? 0} / {data.metrics?.p2Count ?? 0} / {data.metrics?.p3Count ?? 0}
            </span>
          </div>
        </div>
      </section>

      {/* 5. 作者の設計判断と論点 (Authors Decisions) */}
      {summary.authorsDecisions && summary.authorsDecisions.length > 0 && (
        <section className="flex flex-col gap-3 w-full">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">作者の設計判断と論点</h2>
            <span className="text-xs text-gray-400">PR作者の意図とレビューでの確認ポイント</span>
          </div>
          <div className="border border-[#30363d] rounded-2xl bg-[#161b22] p-4 divide-y divide-[#30363d]/60">
            {summary.authorsDecisions.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start justify-between gap-3 ${idx > 0 ? 'pt-3' : ''} ${
                  idx < summary.authorsDecisions!.length - 1 ? 'pb-3' : ''
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-[#00AFA8] font-bold text-sm leading-none pt-1">•</span>
                  <p className="text-xs text-gray-200 leading-relaxed">{item.decision}</p>
                </div>
                {item.commentId && (
                  <button
                    type="button"
                    onClick={() => onSelectComment(item.commentId!)}
                    className="shrink-0 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#00AFA8]/20 text-[#00AFA8] border border-[#30363d] hover:border-[#00AFA8]/40 font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
                    title={`指摘 ${item.commentId} へ移動`}
                  >
                    <span>{item.commentId}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. 到達経路 (Reach Paths) */}
      {summary.reachPaths && summary.reachPaths.length > 0 && (
        <section className="flex flex-col gap-3 w-full">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">到達経路</h2>
          <div className="border border-[#30363d] rounded-2xl bg-[#161b22] overflow-hidden">
            {typeof summary.reachPaths[0] === 'string' ? (
              <div className="divide-y divide-[#30363d]/70">
                {(summary.reachPaths as string[]).map((p, i) => (
                  <div key={i} className="p-3 text-xs font-mono text-gray-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00AFA8]" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#30363d] bg-[#12161c]">
                    <th className="p-3 font-semibold text-gray-400 uppercase text-[10.5px]">呼び出し元</th>
                    <th className="p-3 font-semibold text-gray-400 uppercase text-[10.5px]">条件</th>
                    <th className="p-3 font-semibold text-gray-400 uppercase text-[10.5px]">効き方</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/70">
                  {(summary.reachPaths as any[]).map((row, i) => (
                    <tr key={i} className="hover:bg-[#1f242c]/50">
                      <td className="p-3 font-mono text-gray-200">{row.caller}</td>
                      <td className="p-3 font-mono text-gray-400">{row.condition}</td>
                      <td className="p-3 text-gray-300">{row.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* 6. 変更コード (Changed Code) */}
      {summary.changedCode && (
        <section className="flex flex-col gap-3 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">変更コード</h2>
            <button
              type="button"
              onClick={() => setShowChangedCode(!showChangedCode)}
              className="text-xs text-[#00AFA8] hover:underline font-semibold"
            >
              {showChangedCode ? '閉じる' : '開く'}
            </button>
          </div>

          {showChangedCode && (
            <div className="border border-[#30363d] rounded-2xl bg-[#161b22] overflow-hidden">
              {typeof summary.changedCode === 'string' ? (
                <div className="p-4 text-xs font-mono text-gray-300 leading-relaxed">
                  {summary.changedCode}
                </div>
              ) : (
                <div className="divide-y divide-[#30363d]/70">
                  {summary.changedCode.map((row, idx) => (
                    <div key={idx} className="p-3.5 flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#21262d] text-gray-300 shrink-0 font-mono">
                        {row.layer}
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="font-mono text-xs text-gray-200 truncate">{row.file}</span>
                        <span className="text-xs text-gray-400">{row.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 7. 指摘カード一覧 */}
      <section className="flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#30363d] pb-3">
          <h2 className="text-sm font-bold text-gray-200">
            指摘 — 表示中 {comments.length} / 全 {data.comments.length} 件
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleAll(!allOpened)}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-[#21262d] hover:bg-[#2c323c] text-gray-300 border border-[#30363d] transition-colors"
            >
              {allOpened ? 'すべて折りたたむ' : 'すべて開く'}
            </button>
            <span className="w-px h-4 bg-[#30363d]" />
            <span className="text-xs text-gray-400">表示中を一括:</span>
            <button
              type="button"
              onClick={() => onBulkMark('post')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#00AFA8]/15 hover:bg-[#00AFA8]/30 text-[#00AFA8] border border-[#00AFA8]/30 transition-colors"
            >
              すべて投稿
            </button>
            <button
              type="button"
              onClick={() => onBulkMark('hold')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition-colors"
            >
              すべて保留
            </button>
            <button
              type="button"
              onClick={() => onBulkMark('skip')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-700/50 hover:bg-gray-700 text-gray-400 border border-gray-600 transition-colors"
            >
              すべて見送り
            </button>
          </div>
        </div>

        {/* 各指摘カード */}
        <div className="flex flex-col gap-5">
          {comments.map((c) => {
            const isOpened = openMap[c.id] !== false; // デフォルト開
            const currentMark = marks[c.id];
            const currentMemo = memos[c.id] || '';
            const tagMeta = TAG_META[c.tag ?? 'IMO'] || TAG_META.IMO;
            const lensMeta = c.lens ? LENS_META[c.lens] : undefined;
            const fileUrl = getFileUrl(c);
            const isActive = activeCommentId === c.id;

            return (
              <article
                key={c.id}
                id={`comment-${c.id}`}
                className={`rounded-2xl border bg-[#161b22] transition-all shadow-sm ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : currentMark === 'post'
                    ? 'border-[#00AFA8]/60'
                    : currentMark === 'hold'
                    ? 'border-amber-400/60'
                    : currentMark === 'skip'
                    ? 'border-[#30363d] opacity-60'
                    : 'border-[#30363d]'
                }`}
              >
                {/* カードヘッダー (sticky top-12: コンパクトPRバーの直下に隙間なく吸着) */}
                <div
                  className={`sticky top-12 z-20 px-5 py-3.5 flex items-start gap-3.5 bg-[#161b22]/98 backdrop-blur-md transition-colors ${
                    isOpened ? 'rounded-t-2xl border-b border-[#30363d]/80 shadow-sm' : 'rounded-2xl'
                  }`}
                >
                  <span className="px-2.5 py-1 rounded-lg bg-[#21262d] border border-[#30363d] font-mono font-bold text-sm text-gray-200 shrink-0">
                    {c.id}
                  </span>

                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Severity */}
                      {c.severity && (
                        <span
                          title={`重大度: ${c.severity}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                            SEVERITY_META[c.severity]?.badge ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }`}
                        >
                          {SEVERITY_META[c.severity]?.label ?? c.severity}
                        </span>
                      )}

                      {/* Category */}
                      {c.category && (
                        <span
                          title={`カテゴリ: ${c.category}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-mono border ${
                            CATEGORY_META[c.category]?.bg ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }`}
                        >
                          {CATEGORY_META[c.category]?.label ?? c.category}
                        </span>
                      )}

                      {/* Tag */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${tagMeta.bg}`}>
                        {c.tag ?? 'IMO'}
                      </span>
                      <span className="text-[11px] text-gray-400">{tagMeta.meaning}</span>

                      {/* Lens */}
                      {lensMeta && (
                        <span title={lensMeta.desc} className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${lensMeta.color}`}>
                          {lensMeta.label}
                        </span>
                      )}

                      {/* Outdated */}
                      {c.location?.outdated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <AlertTriangle className="w-3 h-3" />
                          位置が古い可能性
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-gray-100 leading-snug">
                      {c.title}
                    </h3>

                    {/* ファイルリンク */}
                    {fileUrl && (
                      <div className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#00AFA8] hover:underline truncate"
                        >
                          {c.path}
                          {c.line ? `:${c.line}` : ''}
                        </a>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* 開閉ボタン */}
                  <button
                    type="button"
                    onClick={() => handleToggleCard(c.id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#21262d] transition-colors shrink-0"
                  >
                    {isOpened ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* カード本文（開閉コンテンツ） */}
                {isOpened && (
                  <div className="p-5 flex flex-col gap-4 text-xs">
                    {/* 一次判定理由 (lens.reason) */}
                    {c.lens?.reason && (
                      <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-2.5 text-xs">
                        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-blue-300 block mb-0.5">一次判定理由 ({c.lens.verdict}):</span>
                          <span className="text-blue-200/90 leading-relaxed">{c.lens.reason}</span>
                          {c.lens.rule && (
                            <span className="mt-1 block font-mono text-[10.5px] text-blue-300/70">
                              Rule: {c.lens.rule}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3区分定義リスト */}
                    <div className="flex flex-col gap-3">
                      {c.problem && (
                        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d]/70 flex flex-col gap-1">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-400">問題 (Problem)</span>
                          <p className="text-xs leading-relaxed text-gray-200 whitespace-pre-wrap">{c.problem}</p>
                        </div>
                      )}

                      {c.proposal && (
                        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d]/70 flex flex-col gap-1">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#00AFA8]">改善案 (Proposal)</span>
                          <p className="text-xs leading-relaxed text-gray-200 whitespace-pre-wrap">{c.proposal}</p>
                        </div>
                      )}

                      {c.relationToExisting && (
                        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d]/70 flex flex-col gap-1">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400">既存レビューとの関係 (Relation)</span>
                          <p className="text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">{c.relationToExisting}</p>
                        </div>
                      )}

                      {!c.problem && !c.proposal && c.body && (
                        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d]/70">
                          <p className="text-xs leading-relaxed text-gray-200 whitespace-pre-wrap">{c.body}</p>
                        </div>
                      )}
                    </div>

                    {/* コード変更提案 (Suggested Changes) */}
                    {c.suggestion && (c.suggestion.snippet || c.suggestion.replacement) && (
                      <ReviewDiffViewer
                        snippet={c.suggestion.snippet}
                        replacement={c.suggestion.replacement}
                        startLine={c.line ?? 1}
                      />
                    )}

                    {/* Diff Hunk */}
                    {c.location?.origin?.diffHunk && (
                      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-gray-300">
                        <pre className="m-0 whitespace-pre">{c.location.origin.diffHunk}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* 判断ボード 3 択トグル ＆ メモ入力 */}
                <div className="px-5 py-3.5 border-t border-[#30363d]/80 flex flex-col sm:flex-row items-start gap-3 bg-[#161b22] rounded-b-2xl">
                  <div className="inline-flex items-center rounded-full bg-[#0d1117] p-1 border border-[#30363d] shrink-0">
                    <button
                      type="button"
                      onClick={() => onMarkChange(c.id, 'post')}
                      className={`inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold transition-all select-none leading-none ${
                        currentMark === 'post'
                          ? 'bg-[#00AFA8] text-black shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span className="leading-none">投稿する</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkChange(c.id, 'hold')}
                      className={`inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold transition-all select-none leading-none ${
                        currentMark === 'hold'
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="leading-none">保留</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkChange(c.id, 'skip')}
                      className={`inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold transition-all select-none leading-none ${
                        currentMark === 'skip'
                          ? 'bg-gray-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <X className="w-3.5 h-3.5 shrink-0" />
                      <span className="leading-none">投稿しない</span>
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={currentMemo}
                    onChange={(e) => onMemoChange(c.id, e.target.value)}
                    placeholder="対応方針のメモ（ドラッグで高さを変更できます）"
                    className="flex-1 w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00AFA8] resize-y min-h-[38px] max-h-[320px] leading-relaxed"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 9. 相互検証の透明性 (Transparency) */}
      {data.transparency && (() => {
        const t = data.transparency as any;
        const rawCount = t.rawFindingCount ?? t.rawFindingsCount ?? data.comments.length;
        const aggCount = t.aggregatedCount ?? t.synthesizedFindingsCount ?? data.comments.length;
        const dupCount = Math.max(0, rawCount - aggCount);
        const refSpecs: Array<any> = t.referencedSpecs ?? t.specsReferenced ?? [];
        const unrefSpecs: Array<any> = t.unreferencedSpecs ?? t.specsMissing ?? [];

        return (
          <section className="flex flex-col gap-4 w-full border-t border-[#30363d] pt-8">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">相互検証の透明性</h2>
              <span className="text-xs text-gray-400">一次レビュー集約と参照仕様の網羅度</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#30363d] border border-[#30363d] rounded-2xl overflow-hidden">
              <div className="bg-[#161b22] p-4 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">一次レビュー検出</span>
                <span className="text-xl font-mono font-bold text-gray-100">{rawCount} 件</span>
              </div>
              <div className="bg-[#161b22] p-4 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">集約後指摘数</span>
                <span className="text-xl font-mono font-bold text-[#00AFA8]">{aggCount} 件</span>
              </div>
              <div className="bg-[#161b22] p-4 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">重複統合数</span>
                <span className="text-xl font-mono font-bold text-gray-100">{dupCount} 件</span>
              </div>
              <div className="bg-[#161b22] p-4 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">参照仕様数</span>
                <span className="text-xl font-mono font-bold text-gray-100">{refSpecs.length}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#161b22] border border-[#30363d] divide-y divide-[#30363d]/80 text-xs">
              {refSpecs.length > 0 && (
                <div className="p-4 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">参照した仕様ソース:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {refSpecs.map((s, idx) => {
                      const isObj = typeof s === 'object' && s !== null;
                      const name = isObj ? s.name : String(s);
                      const url = isObj ? s.url : undefined;
                      const via = isObj ? s.via : undefined;

                      return (
                        <div key={idx} className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00AFA8] shrink-0" />
                            <span className="font-mono text-[11.5px] text-gray-200 truncate">{name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {via && (
                              <span className="text-[10.5px] text-gray-500 font-mono">via {via}</span>
                            )}
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#00AFA8] hover:text-white p-0.5 rounded transition-colors"
                                title="仕様を開く"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {unrefSpecs.length > 0 && (
                <div className="p-4 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">未参照・欠落している可能性のある仕様:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {unrefSpecs.map((s, idx) => {
                      const isObj = typeof s === 'object' && s !== null;
                      const name = isObj ? s.name : String(s);
                      const reason = isObj ? s.reason : undefined;
                      const supersededBy = isObj ? s.supersededBy : undefined;

                      return (
                        <div key={idx} className="p-2.5 rounded-lg bg-[#0d1117] border border-amber-500/30 flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11.5px] font-bold text-amber-300 truncate">{name}</span>
                            {supersededBy && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                                代替: {supersededBy}
                              </span>
                            )}
                          </div>
                          {reason && (
                            <p className="text-gray-400 text-[11px] leading-relaxed">{reason}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* 9. フッター */}
      <footer className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#30363d] text-xs font-mono text-gray-500 w-full">
        <div className="flex flex-wrap gap-4 items-center">
          <span>Review Base Engine</span>
          <span>Generated: {data.createdAt ? new Date(data.createdAt).toLocaleString('ja-JP') : '-'}</span>
          <span>Verdict: {data.verdict}</span>
        </div>
      </footer>
        </div>
      </div>
    </main>
  );
};
