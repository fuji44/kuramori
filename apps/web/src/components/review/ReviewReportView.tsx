import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import type { ReviewReportData, ReviewComment, MarkType } from '@kuramori/core';
import { ReviewSidebar, type FilterState } from './ReviewSidebar.tsx';
import { ReviewMainContent } from './ReviewMainContent.tsx';
import { ReviewExportModal } from './ReviewExportModal.tsx';
import { ReviewJsonModal } from './ReviewJsonModal.tsx';

interface ReviewReportViewProps {
  reportId: string;
}

export const ReviewReportView: React.FC<ReviewReportViewProps> = ({ reportId }) => {
  const [data, setData] = useState<ReviewReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // 判断マークとメモの状態
  const [marks, setMarks] = useState<Record<string, MarkType>>({});
  const [memos, setMemos] = useState<Record<string, string>>({});

  // フィルタ状態
  const [filters, setFilters] = useState<FilterState>({
    mustReviewOnly: false,
    query: '',
    file: 'all',
    tags: [],
    severities: [],
    categories: [],
    lensVerdicts: [],
    verify: 'all',
    mark: 'all',
  });

  // アクティブなコメントID（索引クリック等）
  const [activeCommentId, setActiveCommentId] = useState<string | undefined>(undefined);

  // モーダル表示状態
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [jsonModalOpen, setJsonModalOpen] = useState<boolean>(false);

  // localStorage 復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`review-decisions-${reportId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.marks) {
          setMarks(parsed.marks);
          setMemos(parsed.memos || {});
        } else {
          // 旧形式からのマイグレーション
          const convertedMarks: Record<string, MarkType> = {};
          const convertedMemos: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            const val = v as any;
            if (val?.status) {
              const s = val.status === 'ignore' ? 'skip' : val.status;
              convertedMarks[k] = s as MarkType;
            }
            if (val?.memo) {
              convertedMemos[k] = val.memo;
            }
          }
          setMarks(convertedMarks);
          setMemos(convertedMemos);
        }
      }
    } catch {}
  }, [reportId]);

  // localStorage 保存
  const persistState = (newMarks: Record<string, MarkType>, newMemos: Record<string, string>) => {
    try {
      localStorage.setItem(
        `review-decisions-${reportId}`,
        JSON.stringify({ marks: newMarks, memos: newMemos })
      );
    } catch {}
  };

  // レポートデータ取得
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setUseIframeFallback(false);

    async function fetchReportData() {
      try {
        const res = await fetch(`/api/reports/${reportId}/data`);
        if (res.status === 404) {
          if (!isCancelled) {
            setUseIframeFallback(true);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load report data: ${res.statusText}`);
        }

        const json = await res.json();
        if (!isCancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setUseIframeFallback(true);
          setLoading(false);
        }
      }
    }

    fetchReportData();
    return () => {
      isCancelled = true;
    };
  }, [reportId]);

  // マーク変更
  const handleMarkChange = (commentId: string, mark: MarkType) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (next[commentId] === mark) {
        delete next[commentId]; // トグル解除
      } else {
        next[commentId] = mark;
      }
      persistState(next, memos);
      return next;
    });
  };

  // メモ変更
  const handleMemoChange = (commentId: string, memo: string) => {
    setMemos((prev) => {
      const next = { ...prev, [commentId]: memo };
      persistState(marks, next);
      return next;
    });
  };

  // 一括マーク
  const handleBulkMark = (mark: MarkType) => {
    setMarks((prev) => {
      const next = { ...prev };
      for (const c of filteredComments) {
        next[c.id] = mark;
      }
      persistState(next, memos);
      return next;
    });
  };

  // フィルタ変更
  const handleFilterChange = (partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  // フィルタ初期化
  const handleResetFilters = () => {
    setFilters({
      mustReviewOnly: false,
      query: '',
      file: 'all',
      tags: [],
      severities: [],
      categories: [],
      lensVerdicts: [],
      verify: 'all',
      mark: 'all',
    });
  };

  // 全判断（マーク・メモ）のクリア
  const handleClearMarks = () => {
    setMarks({});
    setMemos({});
    persistState({}, {});
  };

  // 指摘スクロール選択
  const handleSelectComment = (commentId: string) => {
    setActiveCommentId(commentId);
    setTimeout(() => {
      const el = document.getElementById(`comment-${commentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  // フィルタリング処理
  const filteredComments = useMemo(() => {
    if (!data?.comments) return [];

    return data.comments.filter((c) => {
      // 1. 必須確認ショートカット (要検証・採用・P1 で未見送り)
      if (filters.mustReviewOnly) {
        const isTarget = c.lens?.verdict === 'escalate' || c.lens?.verdict === 'promote' || c.severity === 'P1';
        const isNotSkipped = marks[c.id] !== 'skip';
        if (!isTarget || !isNotSkipped) return false;
      } else {
        // 通常の重大度・判定複数選択フィルタ (個別指定時は AND 評価)
        if (filters.severities.length > 0 && (!c.severity || !filters.severities.includes(c.severity))) {
          return false;
        }

        if (filters.lensVerdicts.length > 0 && (!c.lens?.verdict || !filters.lensVerdicts.includes(c.lens.verdict))) {
          return false;
        }
      }

      // 2. マークフィルタ
      if (filters.mark === 'post' && marks[c.id] !== 'post') return false;
      if (filters.mark === 'hold' && marks[c.id] !== 'hold') return false;
      if (filters.mark === 'skip' && marks[c.id] !== 'skip') return false;
      if (filters.mark === 'unset' && marks[c.id] !== undefined) return false;

      // 3. カテゴリ (Category) 複数選択フィルタ (空なら全件)
      if (filters.categories.length > 0 && (!c.category || !filters.categories.includes(c.category))) {
        return false;
      }

      // 6. ファイルフィルタ
      if (filters.file !== 'all' && c.path !== filters.file) return false;

      // 7. タグフィルタ
      if (filters.tags.length > 0 && (!c.tag || !filters.tags.includes(c.tag))) return false;

      // 8. 検索クエリ
      if (filters.query.trim()) {
        const q = filters.query.toLowerCase();
        const textToSearch = [
          c.id,
          c.title,
          c.problem ?? '',
          c.proposal ?? '',
          c.body ?? '',
          c.path ?? '',
          c.category ?? '',
          c.severity ?? '',
          c.lens?.reason ?? '',
          memos[c.id] ?? '',
        ].join(' ').toLowerCase();

        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [data?.comments, filters, marks, memos]);

  // エクスポート Markdown テキストの生成
  const exportText = useMemo(() => {
    if (!data) return '';
    const lines: string[] = [];
    const postComments = data.comments.filter((c) => marks[c.id] === 'post');

    lines.push(`## PR #${data.pr?.number ?? ''} レビュー判断結果`);
    lines.push(`- 対象: ${data.pr?.repo ?? ''} (${data.pr?.title ?? ''})`);
    lines.push(`- 投稿予定件数: ${postComments.length} 件 / 全 ${data.comments.length} 件`);
    lines.push('');

    if (postComments.length === 0) {
      lines.push('（現在「投稿する」マークが付いた指摘はありません）');
    } else {
      for (const c of postComments) {
        const memo = memos[c.id];
        lines.push(`### [${c.id}] [${c.tag ?? 'IMO'}] ${c.title}`);
        if (c.path) {
          lines.push(`- 場所: \`${c.path}${c.line ? `:${c.line}` : ''}\``);
        }
        if (c.problem) {
          lines.push(`- **問題**: ${c.problem}`);
        }
        if (c.proposal) {
          lines.push(`- **提案**: ${c.proposal}`);
        }
        if (memo) {
          if (memo.includes('\n')) {
            lines.push(`- **メモ**:`);
            for (const mLine of memo.split('\n')) {
              lines.push(`  ${mLine}`);
            }
          } else {
            lines.push(`- **メモ**: ${memo}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }, [data, marks, memos]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#00AFA8] mb-3" />
        <p className="text-sm">レビューレポートを読み込み中...</p>
      </div>
    );
  }

  // 旧レポートの iframe フォールバック
  if (useIframeFallback) {
    return (
      <div className="flex-1 w-full h-full flex flex-col">
        <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between text-xs text-gray-400">
          <span>旧形式 HTML レポートプレビュー</span>
          <a
            href={`/api/reports/${reportId}/html`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-200 flex items-center gap-1"
          >
            別タブで開く <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <iframe
          src={`/api/reports/${reportId}/html`}
          title="AI Review Report Fallback"
          className="w-full flex-1 border-0 bg-white"
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-gray-400">
        <AlertCircle className="w-8 h-8 text-rose-500 mb-3" />
        <p className="text-sm">{error || 'レポートデータを取得できませんでした。'}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full h-full flex overflow-hidden bg-[#0d1117]">
      {/* 左ペイン: 操作・進捗・フィルタ・索引 */}
      <ReviewSidebar
        data={data}
        marks={marks}
        memos={memos}
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onClearMarks={handleClearMarks}
        onSelectComment={handleSelectComment}
        activeCommentId={activeCommentId}
        onOpenExport={() => setExportModalOpen(true)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 右ペイン: 要約・図・PRメタ・指摘カード・透明性 */}
      <ReviewMainContent
        data={data}
        comments={filteredComments}
        marks={marks}
        memos={memos}
        onMarkChange={handleMarkChange}
        onMemoChange={handleMemoChange}
        onBulkMark={handleBulkMark}
        onSelectComment={handleSelectComment}
        activeCommentId={activeCommentId}
        onOpenJson={() => setJsonModalOpen(true)}
        isSidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* エクスポートモーダル */}
      <ReviewExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        exportText={exportText}
      />

      {/* JSON表示モーダル */}
      <ReviewJsonModal
        isOpen={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
        data={data}
        reportId={reportId}
      />
    </div>
  );
};
