import type React from 'react';
import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Filter,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  GitCommit,
} from 'lucide-react';
import type {
  ReviewComment,
  Severity,
  FindingCategory,
  FindingTag,
  LensVerdict,
  ReviewPrMeta,
} from '@kuramori/core';
import { useI18n } from '../../i18n/context.tsx';
import { assertNever } from '../../utils/assert.ts';

export type DecisionType = 'post' | 'hold' | 'ignore';

export interface CommentDecision {
  status?: DecisionType;
  note?: string;
}

interface ReviewCommentsListProps {
  comments: ReviewComment[];
  reportId: string;
  pr?: ReviewPrMeta;
  activeCommentId?: string;
  onSelectComment?: (id: string) => void;
}

export const ReviewCommentsList: React.FC<ReviewCommentsListProps> = ({
  comments,
  reportId,
  pr,
  activeCommentId,
  onSelectComment,
}) => {
  const { t, locale } = useI18n();
  const isJa = locale === 'ja';
  const openBracket = isJa ? '【' : '[';
  const closeBracket = isJa ? '】' : ']';
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'ALL'>('ALL');
  const [selectedCategory, _setSelectedCategory] = useState<FindingCategory | 'ALL'>('ALL');
  const [selectedDecision, setSelectedDecision] = useState<DecisionType | 'ALL' | 'UNSET'>('ALL');

  // localStorage による判断とメモの永続化
  const storageKey = `review-decisions-${reportId}`;
  const [decisions, setDecisions] = useState<Record<string, CommentDecision>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [copied, setCopied] = useState<boolean>(false);
  const [collapsedLens, setCollapsedLens] = useState<Record<string, boolean>>({
    drop: true, // drop は既定で折りたたみ（消さない）
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(decisions));
    } catch (err) {
      console.error('Failed to save decisions to localStorage', err);
    }
  }, [decisions, storageKey]);

  const handleSetDecision = (id: string, status: DecisionType) => {
    setDecisions((prev) => {
      const current = prev[id] || {};
      const nextStatus = current.status === status ? undefined : status; // 再クリックでトグル解除
      return {
        ...prev,
        [id]: { ...current, status: nextStatus },
      };
    });
  };

  const handleSetNote = (id: string, note: string) => {
    setDecisions((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), note },
    }));
  };

  const handleBulkMark = (status: DecisionType, filterTag?: FindingTag) => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const c of comments) {
        if (!filterTag || c.tag === filterTag) {
          next[c.id] = { ...(next[c.id] || {}), status };
        }
      }
      return next;
    });
  };

  const handleClearDecisions = () => {
    if (confirm(t('review.commentsList.confirmClear'))) {
      setDecisions({});
    }
  };

  // 集計計算
  const postCount = comments.filter((c) => decisions[c.id]?.status === 'post').length;
  const holdCount = comments.filter((c) => decisions[c.id]?.status === 'hold').length;
  const ignoreCount = comments.filter((c) => decisions[c.id]?.status === 'ignore').length;
  const unsetCount = comments.length - postCount - holdCount - ignoreCount;

  // クリップボードへ構造化テキストを書き出す
  const handleCopyExportText = async () => {
    const lines: string[] = [
      `# PR Review Decisions — Report ID: ${reportId}`,
      `Date: ${new Date().toISOString()}`,
      `Summary: Post: ${postCount} / Hold: ${holdCount} / Skip: ${ignoreCount} / Undecided: ${unsetCount}`,
      '',
    ];

    // 1. 投稿する
    lines.push('## 【Post】 (To be posted on GitHub review)');
    const postComments = comments.filter((c) => decisions[c.id]?.status === 'post');
    if (postComments.length === 0) {
      lines.push('(None)');
    } else {
      for (const c of postComments) {
        const d = decisions[c.id];
        lines.push(`### [${c.id}] ${c.title} (${c.severity} / ${c.tag || 'MUST'} / ${c.category})`);
        lines.push(`- Location: \`${c.path}:${c.line}\``);
        if (c.problem) lines.push(`- Problem: ${c.problem}`);
        if (c.proposal) lines.push(`- Proposal: ${c.proposal}`);
        if (c.relationToExisting) lines.push(`- Relation: ${c.relationToExisting}`);
        if (d?.note) lines.push(`- Reviewer Note: **${d.note}**`);
        lines.push('');
      }
    }

    // 2. 保留
    lines.push('## 【Hold】 (Pending team discussion)');
    const holdComments = comments.filter((c) => decisions[c.id]?.status === 'hold');
    if (holdComments.length === 0) {
      lines.push('(None)');
    } else {
      for (const c of holdComments) {
        const d = decisions[c.id];
        lines.push(`### [${c.id}] ${c.title} (${c.severity} / ${c.tag || 'MUST'})`);
        lines.push(`- Location: \`${c.path}:${c.line}\``);
        if (d?.note) lines.push(`- Discussion Point: **${d.note}**`);
        lines.push('');
      }
    }

    // 3. 投稿しない
    lines.push('## 【Skip】 (Do not post)');
    const ignoreComments = comments.filter((c) => decisions[c.id]?.status === 'ignore');
    if (ignoreComments.length === 0) {
      lines.push('(None)');
    } else {
      for (const c of ignoreComments) {
        const d = decisions[c.id];
        lines.push(`- [${c.id}] ${c.title} (\`${c.path}:${c.line}\`)${d?.note ? ` : ${d.note}` : ''}`);
      }
    }

    const fullText = lines.join('\n');
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      prompt(t('review.commentsList.copyFailedPrompt'), fullText);
    }
  };

  const getTagBadge = (tag?: FindingTag) => {
    const t = tag || 'MUST';
    switch (t) {
      case 'MUST':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">MUST</span>;
      case 'Q':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Q</span>;
      case 'IMO':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">IMO</span>;
      case 'NIT':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-300 border border-gray-500/30">NIT</span>;
      default:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{t}</span>;
    }
  };

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'P1':
        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-600/40">P1 (Blocker)</span>;
      case 'P2':
        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-600/40">P2 (Warning)</span>;
      case 'P3':
        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-600/40">P3 (Note)</span>;
      default:
        return assertNever(severity);
    }
  };

  const getGitHubLineUrl = (comment: ReviewComment): string | null => {
    if (!pr || !pr.owner || !pr.repo) return null;
    const sha = comment.location?.current?.headSha || comment.location?.origin?.headSha || pr.headSha;
    if (!sha) return null;
    const line = comment.location?.current?.line || comment.line;
    return `https://github.com/${pr.owner}/${pr.repo}/blob/${sha}/${comment.path}#L${line}`;
  };

  const filteredComments = comments.filter((comment) => {
    if (selectedSeverity !== 'ALL' && comment.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'ALL' && comment.category !== selectedCategory) return false;
    const status = decisions[comment.id]?.status;
    if (selectedDecision === 'UNSET' && status !== undefined) return false;
    if (selectedDecision !== 'ALL' && selectedDecision !== 'UNSET' && status !== selectedDecision) return false;
    return true;
  });

  // Lens (escalate / promote / keep / drop) ごとにグループ分け
  const groupedComments: Record<LensVerdict | 'standard', ReviewComment[]> = {
    escalate: [],
    promote: [],
    keep: [],
    drop: [],
    standard: [],
  };

  for (const c of filteredComments) {
    if (c.lens?.verdict) {
      groupedComments[c.lens.verdict].push(c);
    } else {
      groupedComments.standard.push(c);
    }
  }

  const renderCommentCard = (comment: ReviewComment) => {
    const decision = decisions[comment.id] || {};
    const isResolved = decision.status === 'ignore';
    const isPosted = decision.status === 'post';
    const isHeld = decision.status === 'hold';
    const isActive = activeCommentId === comment.id;

    const gitHubUrl = getGitHubLineUrl(comment);
    const isOutdated = comment.location?.outdated;

    let cardBorder = 'border-[#30363d]';
    let cardBg = 'bg-[#161b22]';
    if (isPosted) {
      cardBorder = 'border-emerald-500/70 ring-1 ring-emerald-500/30';
      cardBg = 'bg-emerald-950/20';
    } else if (isHeld) {
      cardBorder = 'border-amber-500/70 ring-1 ring-amber-500/30';
      cardBg = 'bg-amber-950/20';
    } else if (isResolved) {
      cardBorder = 'border-gray-700/40';
      cardBg = 'bg-[#12161c] opacity-60';
    }

    if (isActive) {
      cardBorder = 'border-indigo-500 ring-2 ring-indigo-500/50';
    }

    return (
      <div
        id={`comment-${comment.id}`}
        key={comment.id}
        onClick={() => onSelectComment?.(comment.id)}
        className={`${cardBg} ${cardBorder} border rounded-xl p-4 transition-all shadow-sm space-y-3`}
      >
        {/* カードヘッダー */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#21262d] text-indigo-300 border border-[#30363d]">
              {comment.id}
            </span>
            {getTagBadge(comment.tag)}
            {getSeverityBadge(comment.severity)}
            <span className="text-[10px] font-mono text-gray-400 bg-[#21262d] px-1.5 py-0.5 rounded border border-[#30363d]">
              {comment.category}
            </span>
            {comment.lens?.verdict && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-600/30">
                Lens: {comment.lens.verdict}
              </span>
            )}
            {isOutdated && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-600/30">
                {t('review.commentsList.outdatedBadge')}
              </span>
            )}
          </div>

          {/* 3択 判断トグルボタン */}
          <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSetDecision(comment.id, 'post');
              }}
              className={`inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium transition-colors select-none leading-none ${
                isPosted
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-emerald-300 hover:bg-emerald-950/30'
              }`}
              title={t('review.commentsList.postBtnTitle')}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">{t('review.commentsList.postBtn')}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSetDecision(comment.id, 'hold');
              }}
              className={`inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium transition-colors select-none leading-none ${
                isHeld
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-amber-300 hover:bg-amber-950/30'
              }`}
              title={t('review.commentsList.holdBtnTitle')}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">{t('review.commentsList.holdBtn')}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSetDecision(comment.id, 'ignore');
              }}
              className={`inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium transition-colors select-none leading-none ${
                isResolved
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
              title={t('review.commentsList.skipBtnTitle')}
            >
              <Ban className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">{t('review.commentsList.skipBtn')}</span>
            </button>
          </div>
        </div>

        {/* タイトルと場所リンク */}
        <div>
          <h4 className="text-sm font-semibold text-gray-100">{comment.title}</h4>
          <div className="text-xs font-mono text-indigo-300 mt-1 flex items-center gap-2 flex-wrap">
            <span>{comment.path}:{comment.line}</span>
            <span className="text-[10px] text-gray-500">({comment.side})</span>
            {gitHubUrl && (
              <a
                href={gitHubUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-gray-400 hover:text-indigo-300 flex items-center gap-1 ml-1"
                title={t('review.commentsList.openInGithubTitle')}
              >
                <GitCommit className="w-3 h-3" />
                <span>{t('review.commentsList.openInGithub')}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* 3 大定義リスト (問題 / 改善案 / 既存レビューとの関係) */}
        <div className="space-y-2 text-xs bg-[#0d1117] p-3 rounded-lg border border-[#30363d]/60">
          {comment.problem ? (
            <div>
              <span className="font-semibold text-rose-400">{openBracket}{t('review.commentsList.problemLabel')}{closeBracket}: </span>
              <span className="text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.problem}</span>
            </div>
          ) : (
            <div>
              <span className="font-semibold text-rose-400">{openBracket}{t('review.commentsList.detailLabel')}{closeBracket}: </span>
              <span className="text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.body}</span>
            </div>
          )}

          {comment.proposal && (
            <div>
              <span className="font-semibold text-emerald-400">{openBracket}{t('review.commentsList.proposalLabel')}{closeBracket}: </span>
              <span className="text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.proposal}</span>
            </div>
          )}

          {comment.relationToExisting && (
            <div>
              <span className="font-semibold text-cyan-400">{openBracket}{t('review.commentsList.relationLabel')}{closeBracket}: </span>
              <span className="text-gray-300 leading-relaxed">{comment.relationToExisting}</span>
            </div>
          )}

          {comment.lens?.reason && (
            <div className="text-[11px] text-purple-300/80 pt-1 border-t border-[#30363d]/40">
              <span className="font-semibold">{openBracket}{t('review.commentsList.reasonLabel')}{closeBracket}: </span>
              {comment.lens.reason}
            </div>
          )}
        </div>

        {/* outdated 時の diffHunk 提示 */}
        {isOutdated && comment.location?.origin?.diffHunk && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2.5 space-y-1 font-mono text-xs">
            <div className="text-[10px] text-amber-400">{t('review.commentsList.outdatedDiffHunk')}</div>
            <pre className="text-gray-300 overflow-x-auto whitespace-pre p-1">
              {comment.location.origin.diffHunk}
            </pre>
          </div>
        )}

        {/* 置換提案スニペット */}
        {comment.suggestion && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 space-y-1.5 font-mono text-xs">
            {comment.suggestion.snippet && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase">{t('review.commentsList.existingCode')}</div>
                <pre className="text-rose-400 bg-rose-950/20 p-1.5 rounded overflow-x-auto">
                  - {comment.suggestion.snippet}
                </pre>
              </div>
            )}
            {comment.suggestion.replacement && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase">{t('review.commentsList.recommendedFix')}</div>
                <pre className="text-emerald-400 bg-emerald-950/20 p-1.5 rounded overflow-x-auto">
                  + {comment.suggestion.replacement}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* レビュアー自由記述メモ欄 */}
        <div className="pt-2 border-t border-[#30363d]/60 flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-1.5 shrink-0" />
          <input
            type="text"
            value={decision.note || ''}
            onChange={(e) => handleSetNote(comment.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={t('review.commentsList.notePlaceholder')}
            className="w-full bg-[#0d1117] text-xs text-gray-200 border border-[#30363d] rounded px-2.5 py-1.5 outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sticky 判断ボード集計 ＆ 一括操作ストリップ */}
      <div className="sticky top-0 z-10 bg-[#161b22] p-3 rounded-xl border border-[#30363d] shadow-lg space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-200">{t('review.commentsList.reviewBoard')}</span>
            <div className="flex items-center gap-1 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                {t('review.commentsList.postCount', { count: postCount })}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                {t('review.commentsList.holdCount', { count: holdCount })}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30 font-medium">
                {t('review.commentsList.ignoreCount', { count: ignoreCount })}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                {t('review.commentsList.unsetCount', { count: unsetCount })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkMark('post')}
              className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded text-xs transition-colors"
            >
              {t('review.commentsList.markAllPost')}
            </button>
            <button
              type="button"
              onClick={() => handleBulkMark('post', 'MUST')}
              className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-rose-300 rounded text-xs transition-colors"
              title={t('review.commentsList.markMustPostTitle')}
            >
              {t('review.commentsList.markMustPost')}
            </button>
            <button
              type="button"
              onClick={handleClearDecisions}
              className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-400 hover:text-rose-300 rounded text-xs transition-colors"
            >
              {t('review.commentsList.clearDecisions')}
            </button>
            <button
              type="button"
              onClick={handleCopyExportText}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('review.commentsList.copiedHandoff') : t('review.commentsList.copyHandoff')}</span>
            </button>
          </div>
        </div>

        {/* フィルタバー */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#30363d]/60 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">{t('review.commentsList.severityFilter')}</span>
            {(['ALL', 'P1', 'P2', 'P3'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSeverity(s)}
                className={`px-2 py-0.5 rounded ${
                  selectedSeverity === s
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-[#0d1117] text-gray-400 hover:text-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">{t('review.commentsList.statusFilter')}</span>
            {(['ALL', 'post', 'hold', 'ignore', 'UNSET'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDecision(d)}
                className={`px-2 py-0.5 rounded ${
                  selectedDecision === d
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-[#0d1117] text-gray-400 hover:text-gray-200'
                }`}
              >
                {d === 'ALL' ? t('review.commentsList.allStatus') : d === 'UNSET' ? t('review.commentsList.unsetStatus') : d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 指摘一覧 (Lens による構造的展開) */}
      {filteredComments.length === 0 ? (
        <div className="p-8 text-center bg-[#161b22] border border-[#30363d] rounded-xl text-gray-400 text-sm">
          {t('review.commentsList.noMatchingComments')}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. 最優先展開: escalate */}
          {groupedComments.escalate.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                <span>{t('review.commentsList.escalateGroup', { count: groupedComments.escalate.length })}</span>
              </div>
              {groupedComments.escalate.map(renderCommentCard)}
            </div>
          )}

          {/* 2. 次に展開: promote */}
          {groupedComments.promote.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>{t('review.commentsList.promoteGroup', { count: groupedComments.promote.length })}</span>
              </div>
              {groupedComments.promote.map(renderCommentCard)}
            </div>
          )}

          {/* 3. 標準・通常: keep & standard */}
          {(groupedComments.keep.length > 0 || groupedComments.standard.length > 0) && (
            <div className="space-y-3">
              {[...groupedComments.keep, ...groupedComments.standard].map(renderCommentCard)}
            </div>
          )}

          {/* 4. 件数保持折りたたみ: drop */}
          {groupedComments.drop.length > 0 && (
            <div className="bg-[#12161c] border border-gray-800 rounded-xl p-3">
              <button
                type="button"
                onClick={() =>
                  setCollapsedLens((prev) => ({ ...prev, drop: !prev.drop }))
                }
                className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-200"
              >
                <span className="flex items-center gap-2 font-medium">
                  {collapsedLens.drop ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {t('review.commentsList.dropGroup', { count: groupedComments.drop.length })}
                </span>
                <span className="text-[11px] opacity-70">{t('review.commentsList.dropNote')}</span>
              </button>

              {!collapsedLens.drop && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-800">
                  {groupedComments.drop.map(renderCommentCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
