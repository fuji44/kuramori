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
import { useI18n } from '../../i18n/context.tsx';
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

const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  MUST: { bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30', text: 'text-rose-400' },
  Q: { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', text: 'text-amber-400' },
  IMO: { bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30', text: 'text-blue-400' },
  NIT: { bg: 'bg-gray-500/15 text-gray-400 border-gray-500/30', text: 'text-gray-400' },
  NR: { bg: 'bg-gray-500/15 text-gray-400 border-gray-500/30', text: 'text-gray-400' },
  FYI: { bg: 'bg-gray-500/15 text-gray-400 border-gray-500/30', text: 'text-gray-400' },
  PRAISE: { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', text: 'text-emerald-400' },
  THOUGHT: { bg: 'bg-gray-500/15 text-gray-400 border-gray-500/30', text: 'text-gray-400' },
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

const LENS_STYLES: Record<string, string> = {
  escalate: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  promote: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  keep: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  drop: 'text-gray-500 bg-gray-500/5 border-gray-700',
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
  const { t, locale } = useI18n();
  const mainRef = useRef<HTMLElement>(null);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [showChangedCode, setShowChangedCode] = useState<boolean>(true);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const getTagMeaning = (tag?: string) => {
    const key = (tag?.toLowerCase() ?? 'imo') as 'must' | 'q' | 'imo' | 'nit' | 'nr' | 'fyi' | 'praise' | 'thought';
    const meanings = {
      must: t('review.main.tagMeanings.must'),
      q: t('review.main.tagMeanings.q'),
      imo: t('review.main.tagMeanings.imo'),
      nit: t('review.main.tagMeanings.nit'),
      nr: t('review.main.tagMeanings.nr'),
      fyi: t('review.main.tagMeanings.fyi'),
      praise: t('review.main.tagMeanings.praise'),
      thought: t('review.main.tagMeanings.thought'),
    };
    return meanings[key] ?? t('review.main.tagMeanings.imo');
  };

  const getLensMeta = (lens?: string) => {
    if (!lens) return undefined;
    const style = LENS_STYLES[lens] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    switch (lens) {
      case 'escalate':
        return { label: t('review.main.lensMeanings.escalateLabel'), desc: t('review.main.lensMeanings.escalateDesc'), color: style };
      case 'promote':
        return { label: t('review.main.lensMeanings.promoteLabel'), desc: t('review.main.lensMeanings.promoteDesc'), color: style };
      case 'keep':
        return { label: t('review.main.lensMeanings.keepLabel'), desc: t('review.main.lensMeanings.keepDesc'), color: style };
      case 'drop':
        return { label: t('review.main.lensMeanings.dropLabel'), desc: t('review.main.lensMeanings.dropDesc'), color: style };
      default:
        return { label: lens, desc: '', color: style };
    }
  };

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
              title={t('review.main.toggleSidebarTitle')}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] text-xs transition-colors shrink-0"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-[#00AFA8]" />
              <span className="text-[11px]">{t('review.main.toggleSidebar')}</span>
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
              title={t('review.main.showJson')}
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
                  title={t('review.main.toggleSidebarTitle')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] text-xs font-sans transition-colors mr-1"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5 text-[#00AFA8]" />
                  <span>{t('review.main.toggleSidebar')}</span>
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
              title={t('review.main.showJson')}
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
          {t('review.main.preliminaryNote')}
        </div>
      </header>

      {/* 1.5 適用されたレビュールール一覧 (Applied Review Rules) */}
      {data.appliedRules && data.appliedRules.length > 0 && (
        <section className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#00AFA8]" />
              <span>{t('review.main.appliedRules', { count: data.appliedRules.length })}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.appliedRules.map((rule) => {
              const isPass = rule.verdict === 'PASS';
              const isFail = rule.verdict === 'FAIL';
              return (
                <div
                  key={rule.ruleId}
                  className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-200 line-clamp-1" title={rule.ruleName}>
                      {rule.ruleName}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                        isFail
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : isPass
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {rule.verdict}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed" title={rule.summary}>
                    {rule.summary}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-[#30363d]/60 font-mono">
                    <span className="capitalize">{rule.category}</span>
                    <span>{t('review.main.findingsCount', { count: rule.findingsCount })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. 要約セクション（3つの文章） */}
      <section className="flex flex-col gap-3 w-full">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('review.main.summaryTitle')}</h2>
        <div className="flex flex-col rounded-2xl bg-[#161b22] border border-[#30363d] overflow-hidden divide-y divide-[#30363d]/80">
          {/* 問題点 */}
          <div className="p-5 flex gap-4 items-start">
            <div className="flex items-center gap-2 min-w-[120px] pt-0.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-bold text-gray-300">{t('review.main.whatIsTheProblem')}</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-200 flex-1">
              {brief.problem || t('review.main.noProblem')}
            </p>
          </div>

          {/* 直し方 */}
          <div className="p-5 flex gap-4 items-start">
            <div className="flex items-center gap-2 min-w-[120px] pt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#00AFA8]" />
              <span className="text-xs font-bold text-gray-300">{t('review.main.howItWasFixed')}</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-200 flex-1">
              {brief.approach || t('review.main.noApproach')}
            </p>
          </div>

          {/* 変わらない範囲 */}
          <div className="p-5 flex gap-4 items-start bg-emerald-500/[0.03]">
            <div className="flex items-center gap-2 min-w-[120px] pt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">{t('review.main.whatDoesNotChange')}</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-300 flex-1">
              {brief.blastRadius || t('review.main.noBlastRadius')}
            </p>
          </div>
        </div>
      </section>

      {/* 3. 図でつかむ（3種類の図） */}
      <section className="flex flex-col gap-5 w-full">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('review.main.diagramTitle')}</h2>
          <span className="text-xs text-gray-400">{t('review.main.diagramDesc')}</span>
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
                  {t('review.main.mechanismTitle')}
                </span>
                <span className="text-sm font-semibold text-gray-100">
                  {t('review.main.mechanismSubtitle')}
                </span>
              </div>
            </div>

            {/* 不具合成立の因果連鎖 (Why) */}
            {summary.mechanism.why && (
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs leading-relaxed space-y-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  {t('review.main.whyTitle')}
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
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">{t('review.main.conditionsTitle')}</span>
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
                      {t('review.main.fixLocation')}
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
                      {t('review.main.invariants')}
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
                  {t('review.main.sequenceTitle')}
                </span>
                <span className="text-sm font-semibold text-gray-100">
                  {t('review.main.sequenceSubtitle', { count: data.callFlow.steps.length })}
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('review.main.prInfoTitle')}</h2>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('review.main.filesChanged')}</span>
            <span className="text-sm font-mono font-bold text-gray-200">{data.metrics?.filesAnalyzed ?? '-'}</span>
          </div>
          <div className="bg-[#161b22] p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('review.main.findingsDetected')}</span>
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('review.main.authorDecisionsTitle')}</h2>
            <span className="text-xs text-gray-400">{t('review.main.authorDecisionsDesc')}</span>
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
                    title={t('review.main.jumpToFinding', { id: item.commentId })}
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('review.main.reachPathsTitle')}</h2>
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
                    <th className="p-3 font-semibold text-gray-400 uppercase text-[10.5px]">{t('review.main.callerHeader')}</th>
                    <th className="p-3 font-semibold text-gray-400 uppercase text-[10.5px]">{t('review.main.conditionHeader')}</th>
                    <th className="p-3 font-semibold text-gray-400 uppercase text-[10.5px]">{t('review.main.effectHeader')}</th>
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('review.main.changedCodeTitle')}</h2>
            <button
              type="button"
              onClick={() => setShowChangedCode(!showChangedCode)}
              className="text-xs text-[#00AFA8] hover:underline font-semibold"
            >
              {showChangedCode ? t('review.main.closeChangedCode') : t('review.main.openChangedCode')}
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
            {t('review.main.findingsHeader', { shown: comments.length, total: data.comments.length })}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleAll(!allOpened)}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-[#21262d] hover:bg-[#2c323c] text-gray-300 border border-[#30363d] transition-colors"
            >
              {allOpened ? t('review.main.collapseAll') : t('review.main.expandAll')}
            </button>
            <span className="w-px h-4 bg-[#30363d]" />
            <span className="text-xs text-gray-400">{t('review.main.batchActionLabel')}</span>
            <button
              type="button"
              onClick={() => onBulkMark('post')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#00AFA8]/15 hover:bg-[#00AFA8]/30 text-[#00AFA8] border border-[#00AFA8]/30 transition-colors"
            >
              {t('review.main.postAll')}
            </button>
            <button
              type="button"
              onClick={() => onBulkMark('hold')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition-colors"
            >
              {t('review.main.holdAll')}
            </button>
            <button
              type="button"
              onClick={() => onBulkMark('skip')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-700/50 hover:bg-gray-700 text-gray-400 border border-gray-600 transition-colors"
            >
              {t('review.main.skipAll')}
            </button>
          </div>
        </div>

        {/* 各指摘カード */}
        <div className="flex flex-col gap-5">
          {comments.map((c) => {
            const isOpened = openMap[c.id] !== false; // デフォルト開
            const currentMark = marks[c.id];
            const currentMemo = memos[c.id] || '';
            const tagStyle = TAG_STYLES[c.tag ?? 'IMO'] || TAG_STYLES.IMO;
            const tagMeaning = getTagMeaning(c.tag);
            const lensMeta = getLensMeta(c.lens);
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
                          title={t('review.main.severityTitle', { severity: c.severity })}
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
                          title={t('review.main.categoryTitle', { category: c.category })}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-mono border ${
                            CATEGORY_META[c.category]?.bg ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }`}
                        >
                          {CATEGORY_META[c.category]?.label ?? c.category}
                        </span>
                      )}

                      {/* Tag */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${tagStyle.bg}`}>
                        {c.tag ?? 'IMO'}
                      </span>
                      <span className="text-[11px] text-gray-400">{tagMeaning}</span>

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
                          {t('review.main.outdatedBadge')}
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
                          <span className="font-bold text-blue-300 block mb-0.5">{t('review.main.lensReason', { verdict: c.lens.verdict })}</span>
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
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-400">{t('review.main.problemLabel')}</span>
                          <p className="text-xs leading-relaxed text-gray-200 whitespace-pre-wrap">{c.problem}</p>
                        </div>
                      )}

                      {c.proposal && (
                        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d]/70 flex flex-col gap-1">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#00AFA8]">{t('review.main.proposalLabel')}</span>
                          <p className="text-xs leading-relaxed text-gray-200 whitespace-pre-wrap">{c.proposal}</p>
                        </div>
                      )}

                      {c.relationToExisting && (
                        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d]/70 flex flex-col gap-1">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400">{t('review.main.relationLabel')}</span>
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
                      <span className="leading-none">{t('review.main.postBtn')}</span>
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
                      <span className="leading-none">{t('review.main.holdBtn')}</span>
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
                      <span className="leading-none">{t('review.main.skipBtn')}</span>
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={currentMemo}
                    onChange={(e) => onMemoChange(c.id, e.target.value)}
                    placeholder={t('review.main.notePlaceholder')}
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
        const trans = data.transparency as any;
        const rawCount = trans.rawFindingCount ?? trans.rawFindingsCount ?? data.comments.length;
        const aggCount = trans.aggregatedCount ?? trans.synthesizedFindingsCount ?? data.comments.length;
        const dupCount = Math.max(0, rawCount - aggCount);
        const refSpecs: Array<any> = trans.referencedSpecs ?? trans.specsReferenced ?? [];
        const unrefSpecs: Array<any> = trans.unreferencedSpecs ?? trans.specsMissing ?? [];

        return (
          <section className="flex flex-col gap-4 w-full border-t border-[#30363d] pt-8">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('review.main.transparencyTitle')}</h2>
              <span className="text-xs text-gray-400">{t('review.main.transparencyDesc')}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#30363d] border border-[#30363d] rounded-2xl overflow-hidden">
              <div className="bg-[#161b22] p-4 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('review.main.rawCountLabel')}</span>
                <span className="text-xl font-mono font-bold text-gray-100">{rawCount}</span>
              </div>
              <div className="bg-[#161b22] p-4 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('review.main.aggCountLabel')}</span>
                <span className="text-xl font-mono font-bold text-[#00AFA8]">{aggCount}</span>
              </div>
              <div className="bg-[#161b22] p-4 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('review.main.dupCountLabel')}</span>
                <span className="text-xl font-mono font-bold text-gray-100">{dupCount}</span>
              </div>
              <div className="bg-[#161b22] p-4 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('review.main.specsCountLabel')}</span>
                <span className="text-xl font-mono font-bold text-gray-100">{refSpecs.length}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#161b22] border border-[#30363d] divide-y divide-[#30363d]/80 text-xs">
              {refSpecs.length > 0 && (
                <div className="p-4 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('review.main.referencedSpecsLabel')}</span>
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
                                title={t('review.main.openSpec')}
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
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t('review.main.missingSpecsLabel')}</span>
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
                                {t('review.main.supersededBy', { by: supersededBy })}
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
          <span>Generated: {data.createdAt ? new Date(data.createdAt).toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US') : '-'}</span>
          <span>Verdict: {data.verdict}</span>
        </div>
      </footer>
        </div>
      </div>
    </main>
  );
};
