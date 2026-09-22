import React, { useState, useRef, useEffect } from 'react';

import {
  GitPullRequest,
  GitPullRequestDraft,
  GitMerge,
  GitPullRequestClosed,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  FileText,
  GitBranch,
  Milestone,
  User,
  RefreshCw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { ReviewItem, ReviewRule } from '../types.ts';
import { getPrAnchorId } from '../utils/anchor.ts';

interface PrCardProps {
  item: ReviewItem;
  rules?: ReviewRule[];
  defaultRuleIds?: string[];
  isSelected?: boolean;
  isHighlighted?: boolean;
  onOpenLog: (e: React.MouseEvent, jobId: string, error?: string | null) => void;
  onRunReview: (e: React.MouseEvent, id: string, ruleIds?: string[]) => void;
  onSelectReport: (reportId: string, prTitle: string) => void;
  onSelectCard?: (anchorId: string) => void;
  onCopyAnchor?: (anchorId: string) => void;
}

export function PrCard({
  item,
  rules = [],
  defaultRuleIds,
  isSelected = false,
  isHighlighted = false,
  onOpenLog,
  onRunReview,
  onSelectReport,
  onSelectCard,
  onCopyAnchor,
}: PrCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rules.length > 0) {
      setSelectedRuleIds(new Set(rules.filter((r) => r.enabled).map((r) => r.id)));
    }
  }, [rules]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const jobStatus = item.latestJob?.status;
  const orgName = item.repository.split('/')[0];
  const isPrUpdatedAfterReport = Boolean(
    item.report?.createdAt && new Date(item.updatedAt).getTime() > new Date(item.report.createdAt).getTime()
  );
  const anchorId = getPrAnchorId(item.repository, item.number);


  return (
    <div
      id={anchorId}
      data-pr-number={item.number}
      onClick={() => onSelectCard?.(anchorId)}
      onDoubleClick={() => onCopyAnchor?.(anchorId)}
      className={`p-4 rounded-xl border transition-all scroll-mt-20 ${
        isSelected || isHighlighted
          ? 'border-sky-500 bg-[#161b22] ring-2 ring-sky-500/70 shadow-lg'
          : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58]'
      }`}
      title="クリックでURLにアンカーを設定、ダブルクリックでアンカーURLをコピー"
    >
      {/* Header: Project Icon & Repo / PR number / Badges (Left) & Results (Right) */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#21262d] mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Project / Organization Icon */}
          <div className="flex items-center gap-1.5 shrink-0">
            <img
              src={`https://github.com/${orgName}.png?size=32`}
              alt={orgName}
              className="w-4 h-4 rounded-sm shrink-0 bg-neutral-800"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-[#8b949e] font-mono hover:text-white transition-colors">
              {item.repository}
            </span>
            <span className="text-xs text-neutral-400 font-mono font-medium">
              #{item.number}
            </span>
          </div>

          {item.isDraft && (
            <span className="text-[11px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
              Draft
            </span>
          )}

          {item.milestone && (
            <span
              className="text-[11px] px-2 py-0.5 rounded bg-[#21262d] text-teal-300 border border-[#30363d] font-mono flex items-center gap-1 shrink-0"
              title={`マイルストーン: ${item.milestone}`}
            >
              <Milestone className="w-3 h-3 text-[#00AFA8]" />
              <span>{item.milestone}</span>
            </span>
          )}
        </div>

        {/* Top-Right: Review Results (Status / Report / Log) */}
        <div className="flex items-center gap-2 shrink-0">
          {jobStatus === 'running' ? (
            <button
              type="button"
              onClick={(e) => {
                if (item.latestJob?.id) {
                  onOpenLog(e, item.latestJob.id, item.latestJob.error);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-950/80 hover:bg-sky-900 text-sky-400 border border-sky-800 hover:border-sky-600 transition-all cursor-pointer"
              title="実行中のログを表示"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>レビュー実行中</span>
            </button>
          ) : jobStatus === 'pending' || jobStatus === 'queued' ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
              <Clock className="w-3 h-3" />
              キュー待機中
            </span>
          ) : jobStatus === 'completed' ? (
            <div className="flex items-center gap-2.5">
              {item.report?.createdAt && (
                <span
                  className="text-[11px] text-neutral-400 shrink-0 hidden sm:inline font-mono"
                  title={`レポート作成日時: ${new Date(item.report.createdAt).toLocaleString('ja-JP')}`}
                >
                  レビュー: {new Date(item.report.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {item.report?.id ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.report?.id) {
                      onSelectReport(item.report.id, `${item.repository}#${item.number}: ${item.title}`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 hover:border-emerald-500 shadow-sm transition-all cursor-pointer group"
                  title="レビューレポートを表示"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-105 transition-transform" />
                  <span>レポート表示</span>
                  {item.report?.verdict && (
                    <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-900/90 text-emerald-200 border border-emerald-700/60 text-[10px] font-mono font-semibold">
                      {item.report.verdict}
                    </span>
                  )}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  レビュー完了
                </span>
              )}
            </div>
          ) : jobStatus === 'failed' ? (
            <button
              type="button"
              onClick={(e) => {
                if (item.latestJob?.id) {
                  onOpenLog(e, item.latestJob.id, item.latestJob.error);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 hover:border-rose-600 transition-all cursor-pointer group"
              title="エラー詳細と実行ログを表示"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-105 transition-transform" />
              <span>失敗 (ログ確認)</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              未レビュー
            </span>
          )}
        </div>
      </div>

      {/* Body: PR Status Icon + Title (Left) & Labels (Right) */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {item.isDraft ? (
            <GitPullRequestDraft
              className="w-4 h-4 text-neutral-400 shrink-0"
              title="Draft Pull Request"
            />
          ) : item.state === 'merged' ? (
            <GitMerge
              className="w-4 h-4 text-purple-400 shrink-0"
              title="Merged Pull Request"
            />
          ) : item.state === 'closed' ? (
            <GitPullRequestClosed
              className="w-4 h-4 text-rose-400 shrink-0"
              title="Closed Pull Request"
            />
          ) : (
            <GitPullRequest
              className="w-4 h-4 text-emerald-400 shrink-0"
              title="Open Pull Request"
            />
          )}

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm md:text-base font-semibold text-white hover:text-sky-400 transition-colors truncate leading-snug group/title flex items-center gap-1.5"
            title={`${item.title} (GitHubで開く)`}
          >
            <span className="truncate">{item.title}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-80 transition-opacity shrink-0 text-sky-400" />
          </a>
        </div>

        {/* Labels */}
        {item.labels && item.labels.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {item.labels.map((lbl) => (
              <span
                key={lbl.name}
                className="inline-flex items-center text-[10.5px] px-2 py-0.5 rounded-md font-medium border transition-colors"
                style={{
                  backgroundColor: lbl.color ? `#${lbl.color}18` : '#21262d',
                  borderColor: lbl.color ? `#${lbl.color}45` : '#30363d',
                  color: lbl.color ? `#${lbl.color}` : '#c9d1d9',
                }}
                title={lbl.description || lbl.name}
              >
                {lbl.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Metadata & Action Buttons */}
      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-[#21262d]/80 text-xs text-[#8b949e] flex-wrap md:flex-nowrap">
        {/* Left metadata */}
        <div className="flex items-center gap-3.5 flex-wrap min-w-0">
          {/* Author */}
          <span className="flex items-center gap-1 shrink-0">
            <span className="text-[#8b949e]">by</span>
            <span className="text-neutral-300 font-medium">@{item.author}</span>
          </span>

          {/* Assignees */}
          {item.assignees && item.assignees.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-neutral-500">担当:</span>
              <div className="flex items-center gap-2">
                {item.assignees.map((assignee) => (
                  <span
                    key={assignee.login}
                    className="inline-flex items-center gap-1 text-neutral-300 font-medium"
                    title={`担当: @${assignee.login}`}
                  >
                    {assignee.avatarUrl ? (
                      <img
                        src={assignee.avatarUrl}
                        alt={assignee.login}
                        className="w-4 h-4 rounded-full border border-[#30363d]"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                    <span>@{assignee.login}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Branch */}
          {item.sourceBranch && (
            <span
              className="flex items-center gap-1 font-mono truncate max-w-[220px]"
              title={`ブランチ: ${item.sourceBranch}`}
            >
              <GitBranch className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
              <span className="truncate">{item.sourceBranch}</span>
            </span>
          )}

          {/* PR Updated At */}
          <span className="shrink-0 text-neutral-500 flex items-center gap-1.5 font-mono">
            <span>PR更新: {new Date(item.updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {isPrUpdatedAfterReport && (
              <span
                className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-normal cursor-help"
                title="レポート作成後にPRへの更新（コミットや変更など）がありました。再実行を推奨します。"
              >
                レビュー後更新あり
              </span>
            )}
          </span>
        </div>

        {/* Bottom-Right: Split Button for Review Execution */}
        <div className="relative flex items-center shrink-0 ml-auto" ref={dropdownRef}>
          <div className="inline-flex rounded-lg shadow-sm border border-[#30363d] overflow-hidden">
            {/* メインボタン (通常実行) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRunReview(e, item.id, defaultRuleIds && defaultRuleIds.length > 0 ? defaultRuleIds : undefined);
              }}
              disabled={jobStatus === 'running' || jobStatus === 'pending' || jobStatus === 'queued'}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-r border-[#30363d]"
              title={
                defaultRuleIds && defaultRuleIds.length > 0
                  ? `既定ルール (${defaultRuleIds.length}件) を実行`
                  : jobStatus === 'completed'
                  ? 'AIレビューを再実行'
                  : jobStatus === 'failed'
                  ? 'AIレビューを再試行'
                  : 'AIレビューを開始'
              }
            >
              {jobStatus === 'running' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  <span>実行中...</span>
                </>
              ) : jobStatus === 'pending' || jobStatus === 'queued' ? (
                <>
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>待機中...</span>
                </>
              ) : jobStatus === 'completed' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-sky-400" />
                  <span>再実行</span>
                </>
              ) : jobStatus === 'failed' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-rose-400" />
                  <span>再試行</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
                  <span>レビュー開始</span>
                </>
              )}
            </button>

            {/* ドロップダウントグルボタン */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen((prev) => !prev);
              }}
              disabled={jobStatus === 'running' || jobStatus === 'pending' || jobStatus === 'queued'}
              className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="ルールを選択して実行"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* ドロップダウンメニュー */}
          {isDropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-2 w-80 bg-[#1c2128] border border-[#30363d] rounded-xl shadow-2xl z-50 p-3 text-xs flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
                <span className="font-semibold text-white">レビュールール選択実行</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedRuleIds(new Set(rules.map((r) => r.id)))}
                    className="text-sky-400 hover:underline"
                  >
                    全選択
                  </button>
                  <span className="text-[#30363d]">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRuleIds(new Set())}
                    className="text-[#8b949e] hover:underline"
                  >
                    全解除
                  </button>
                </div>
              </div>

              {rules.length === 0 ? (
                <div className="py-4 text-center text-[#8b949e]">
                  登録されているルールがありません
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {rules.map((rule) => {
                    const isChecked = selectedRuleIds.has(rule.id);
                    return (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#21262d] transition-colors border border-transparent hover:border-[#30363d]/50"
                      >
                        <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(selectedRuleIds);
                              if (e.target.checked) {
                                next.add(rule.id);
                              } else {
                                next.delete(rule.id);
                              }
                              setSelectedRuleIds(next);
                            }}
                            className="rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500 focus:ring-offset-0 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-white truncate">{rule.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0d1117] text-sky-400 border border-sky-800/40">
                                {rule.category}
                              </span>
                            </div>
                            {rule.description && (
                              <p className="text-[10.5px] text-[#8b949e] truncate">{rule.description}</p>
                            )}
                          </div>
                        </label>

                        {/* 個別即時実行ボタン */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsDropdownOpen(false);
                            onRunReview(e, item.id, [rule.id]);
                          }}
                          className="ml-2 p-1 rounded hover:bg-[#30363d] text-sky-400 hover:text-sky-300 transition-colors shrink-0"
                          title={`「${rule.name}」のみを実行`}
                        >
                          <Play className="w-3.5 h-3.5 fill-sky-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 border-t border-[#30363d] flex items-center justify-between">
                <span className="text-[11px] text-[#8b949e]">
                  {selectedRuleIds.size} 件選択中
                </span>
                <button
                  type="button"
                  disabled={selectedRuleIds.size === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(false);
                    onRunReview(e, item.id, Array.from(selectedRuleIds));
                  }}
                  className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  選択したルールを実行
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
