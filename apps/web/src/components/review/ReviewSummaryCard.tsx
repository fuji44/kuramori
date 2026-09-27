import type React from 'react';
import { useMemo } from 'react';

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  GitFork,
  ShieldCheck,
  AlertOctagon,
  Cpu,
  Layers,
  BookOpen,
} from 'lucide-react';
import type {
  ReviewSummary,
  ReviewMetrics,
  ReviewVerdictType,
  ReviewPrMeta,
} from '@kuramori/core';
import { useI18n } from '../../i18n/context.tsx';
import { assertNever } from '../../utils/assert.ts';

interface ReviewSummaryCardProps {
  verdict: ReviewVerdictType;
  summary: ReviewSummary;
  metrics?: ReviewMetrics;
  pr?: ReviewPrMeta;
  onSelectComment?: (commentId: string) => void;
}

export const ReviewSummaryCard: React.FC<ReviewSummaryCardProps> = ({
  verdict,
  summary,
  metrics,
  pr,
  onSelectComment,
}) => {
  const { t } = useI18n();

  const getVerdictBadge = () => {
    switch (verdict) {
      case 'APPROVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            APPROVE
          </span>
        );
      case 'REQUEST_CHANGES':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-4 h-4 text-rose-400" />
            REQUEST CHANGES
          </span>
        );
      case 'COMMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <AlertTriangle className="w-4 h-4 text-blue-400" />
            COMMENT
          </span>
        );
      default:
        return assertNever(verdict);
    }
  };

  const isBriefObject = typeof summary.brief === 'object' && summary.brief !== null;
  const briefObj = isBriefObject ? summary.brief : null;
  const briefText = typeof summary.brief === 'string' ? summary.brief : '';

  const blastRadius = summary.blastRadius || briefObj?.blastRadius;

  const ruleVerdicts = useMemo(() => {
    const text = typeof summary.brief === 'string'
      ? summary.brief
      : (summary.brief?.problem ?? '');
    const regex = /【(.*?)】(PASS|WARN|FAIL):/g;
    const matches: Array<{ name: string; verdict: 'PASS' | 'WARN' | 'FAIL' }> = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      matches.push({ name: m[1], verdict: m[2] as 'PASS' | 'WARN' | 'FAIL' });
    }
    return matches;
  }, [summary.brief]);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm space-y-4">
      {/* ヘッダー ＆ メタグリッド */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-gray-100">{t('review.summary.title')}</h2>
            <div>{getVerdictBadge()}</div>
          </div>
          {pr && (
            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
              {pr.number && <span>PR #{pr.number}</span>}
              {pr.headSha && <span>SHA: {pr.headSha.slice(0, 7)}</span>}
              {pr.storyUrl && (
                <a
                  href={pr.storyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" /> {t('review.summary.storyIssue')}
                </a>
              )}
            </div>
          )}

          {/* ルール別健全性バッジ列 */}
          {ruleVerdicts.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <span className="text-[11px] text-gray-400 font-medium">{t('review.summary.ruleHealth')}</span>
              {ruleVerdicts.map((rv, idx) => {
                let badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
                if (rv.verdict === 'FAIL') {
                  badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800';
                } else if (rv.verdict === 'WARN') {
                  badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800';
                }
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono border shadow-sm ${badgeColor}`}
                  >
                    <span>{rv.name}:</span>
                    <span className="font-bold">{rv.verdict}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* ブロック 1: 一言まとめ (3点構造: problem / approach / blastRadius) */}
        {briefObj ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {briefObj.problem && (
              <div className="bg-[#0d1117] p-3 rounded-lg border border-rose-500/30">
                <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {t('review.summary.problemSolved')}
                </h3>
                <p className="text-xs text-gray-200 leading-relaxed">{briefObj.problem}</p>
              </div>
            )}
            {briefObj.approach && (
              <div className="bg-[#0d1117] p-3 rounded-lg border border-indigo-500/30">
                <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  {t('review.summary.changeApproach')}
                </h3>
                <p className="text-xs text-gray-200 leading-relaxed">{briefObj.approach}</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {t('review.summary.changeSummary')}
            </h3>
            <p className="text-sm text-gray-200 leading-relaxed bg-[#0d1117] p-3 rounded-lg border border-[#30363d]/60">
              {briefText}
            </p>
          </div>
        )}

        {/* 免責範囲 (blastRadius: レビュアーが最初に知りたい何が変わらないか) */}
        {blastRadius && (
          <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-500/40">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('review.summary.blastRadius')}
            </h3>
            <p className="text-xs text-emerald-200/90 leading-relaxed font-mono">
              {blastRadius}
            </p>
          </div>
        )}

        {/* ブロック 2: 不具合成立の因果連鎖 (mechanism.why) ＆ 発動条件 */}
        {summary.mechanism && (
          <div className="space-y-2 pt-1">
            {summary.mechanism.why && summary.mechanism.why.length > 0 && (
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]/60">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                  {t('review.summary.causalChain')}
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300">
                  {summary.mechanism.why.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {summary.mechanism.conditions && summary.mechanism.conditions.length > 0 && (
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]/60">
                <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1.5">
                  {t('review.summary.triggerConditions')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {summary.mechanism.conditions.map((cond, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ブロック 6: 変更コード (Changed Code: 表または文字列) */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            {t('review.summary.changedCoreCode')}
          </h3>
          {Array.isArray(summary.changedCode) ? (
            <div className="overflow-x-auto rounded-lg border border-[#30363d]/60 bg-[#0d1117]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161b22] text-gray-400 border-b border-[#30363d]/60">
                  <tr>
                    {summary.changedCode.some((c) => c.layer) && <th className="p-2">Layer</th>}
                    <th className="p-2">File</th>
                    {summary.changedCode.some((c) => c.role) && <th className="p-2">Role</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/40">
                  {summary.changedCode.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#161b22]/50">
                      {summary.changedCode.some((c) => c.layer) && (
                        <td className="p-2 font-mono text-indigo-300">{item.layer || '-'}</td>
                      )}
                      <td className="p-2 font-mono text-gray-200">{item.file}</td>
                      {summary.changedCode.some((c) => c.role) && (
                        <td className="p-2 text-gray-300">{item.role || '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed bg-[#0d1117] p-3 rounded-lg border border-[#30363d]/60 font-mono text-xs">
              {summary.changedCode}
            </p>
          )}
        </div>

        {/* ブロック 7: 作者の設計判断 (Authors Decisions ＆ 該当 finding へのアンカー) */}
        {summary.authorsDecisions && summary.authorsDecisions.length > 0 && (
          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]/60 space-y-1.5">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              {t('review.summary.authorDecisions')}
            </h3>
            <ul className="space-y-1.5 text-xs">
              {summary.authorsDecisions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-300">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span className="flex-1 leading-relaxed">{item.decision}</span>
                  {item.commentId !== undefined && (
                    <button
                      type="button"
                      onClick={() => onSelectComment?.(item.commentId)}
                      className="text-xs font-mono text-indigo-400 hover:underline bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0"
                    >
                      {t('review.summary.inspectFinding', { id: item.commentId })}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ブロック 5: 影響波及パス */}
        {summary.reachPaths && summary.reachPaths.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-cyan-400" />
              {t('review.summary.reachPaths', { count: summary.reachPaths.length })}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {summary.reachPaths.map((path, idx) => (
                <span
                  key={idx}
                  className="text-xs font-mono bg-[#21262d] text-gray-300 px-2 py-0.5 rounded border border-[#30363d]"
                >
                  {path}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* メトリクスグリッド */}
        {metrics && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#30363d]/60">
            <div className="bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/40 text-center">
              <div className="text-xs text-gray-400">{t('review.summary.filesAnalyzed')}</div>
              <div className="text-sm font-semibold text-gray-200">{metrics.filesAnalyzed}</div>
            </div>
            <div className="bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/40 text-center">
              <div className="text-xs text-rose-400 font-medium">P1 (Blocker)</div>
              <div className="text-sm font-semibold text-rose-400">{metrics.p1Count}</div>
            </div>
            <div className="bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/40 text-center">
              <div className="text-xs text-amber-400 font-medium">P2 (Warning)</div>
              <div className="text-sm font-semibold text-amber-400">{metrics.p2Count}</div>
            </div>
            <div className="bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/40 text-center">
              <div className="text-xs text-blue-400 font-medium">P3 (Note)</div>
              <div className="text-sm font-semibold text-blue-400">{metrics.p3Count}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
