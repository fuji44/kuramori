import React, { useState, useEffect, useRef } from 'react';
import type { ReviewComment, MarkType } from '@review-base/core';
import { ArrowUp, Check, Clock, X, HelpCircle } from 'lucide-react';

interface ReviewOutlineBarProps {
  comments: ReviewComment[];
  marks: Record<string, MarkType>;
  activeCommentId?: string;
  onSelectComment: (commentId: string) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

interface TooltipState {
  comment: ReviewComment;
  relativeTop: number;
}

export const ReviewOutlineBar: React.FC<ReviewOutlineBarProps> = ({
  comments,
  marks,
  activeCommentId: propActiveCommentId,
  onSelectComment,
  scrollContainerRef,
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [visibleCommentId, setVisibleCommentId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  // IntersectionObserver による Scrollspy（現在閲覧中の指摘を自動検知）
  useEffect(() => {
    if (typeof window === 'undefined' || comments.length === 0) return;

    const rootElement = scrollContainerRef?.current || null;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          const sorted = intersecting.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          const id = sorted[0].target.id.replace('comment-', '');
          setVisibleCommentId(id);
        }
      },
      {
        root: rootElement,
        rootMargin: '-10% 0px -60% 0px',
        threshold: [0, 0.2, 0.5],
      }
    );

    observerRef.current = observer;

    comments.forEach((c) => {
      const el = document.getElementById(`comment-${c.id}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [comments, scrollContainerRef]);

  // 本文スクロール時にツールチップを閉じる
  useEffect(() => {
    const handleScrollOrResize = () => {
      setTooltip(null);
    };

    const container = scrollContainerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleScrollOrResize, { passive: true });
    }
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScrollOrResize);
      }
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [scrollContainerRef]);

  const activeId = propActiveCommentId || visibleCommentId;

  if (comments.length === 0) return null;

  const handleMouseEnter = (c: ReviewComment, e: React.MouseEvent<HTMLDivElement>) => {
    if (!navRef.current) return;
    const navRect = navRef.current.getBoundingClientRect();
    const itemRect = e.currentTarget.getBoundingClientRect();
    const relativeTop = itemRect.top - navRect.top + itemRect.height / 2;
    setTooltip({
      comment: c,
      relativeTop,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const scrollToTop = () => {
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav
      ref={navRef}
      aria-label="指摘索引アウトライン"
      className="relative flex flex-col items-center py-2 px-1 rounded-xl bg-[#161b22]/90 backdrop-blur-sm border border-[#30363d]/60 select-none w-8 shadow-md"
    >
      {/* 最上部: トップへ戻るアイコン */}
      <button
        type="button"
        onClick={scrollToTop}
        title="ページ先頭へスクロール"
        className="w-6 h-5 flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-[#21262d] transition-colors mb-1.5 shrink-0"
      >
        <ArrowUp className="w-3 h-3" />
      </button>

      {/* 目盛りライン群（内部スクロール領域） */}
      <div
        onScroll={() => setTooltip(null)}
        className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto overflow-x-hidden scrollbar-none py-0.5 px-0.5 items-center w-full"
      >
        {comments.map((c) => {
          const m = marks[c.id];
          const isActive = activeId === c.id;
          const isHovered = tooltip?.comment.id === c.id;
          const isP1 = c.severity === 'P1';

          // マーク別の色
          let barColor = 'bg-[#30363d]';
          if (m === 'post') {
            barColor = 'bg-[#00AFA8]';
          } else if (m === 'hold') {
            barColor = 'bg-amber-400';
          } else if (m === 'skip') {
            barColor = 'bg-gray-600/50';
          }

          // ノッチの幅
          let barWidth = isP1 ? 'w-4' : 'w-3';
          if (isActive) {
            barWidth = 'w-5';
            if (!m) barColor = 'bg-gray-200';
          } else if (isHovered) {
            barWidth = isP1 ? 'w-5' : 'w-4';
          }

          return (
            <div
              key={c.id}
              className="w-full h-3 flex items-center justify-center cursor-pointer group/notch"
              onMouseEnter={(e) => handleMouseEnter(c, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onSelectComment(c.id)}
            >
              <div
                className={`h-1 rounded-full transition-all duration-150 ${barWidth} ${barColor} ${
                  isActive
                    ? 'ring-2 ring-white/30 shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                    : isHovered
                    ? 'brightness-125'
                    : ''
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* ポップオーバーツールチップ: overflow-y-auto の外側、親 nav の右横にピタッと配置 */}
      {tooltip && (
        <div
          className="absolute left-full ml-3 z-50 w-72 p-3 rounded-xl bg-[#1c2128] border border-[#30363d] shadow-2xl text-left pointer-events-none animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: `${tooltip.relativeTop}px`,
            transform: 'translateY(-50%)',
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
          }}
        >
          {(() => {
            const c = tooltip.comment;
            const m = marks[c.id];

            let statusText = '未選択';
            let StatusIcon = HelpCircle;
            let statusColor = 'text-gray-400';

            if (m === 'post') {
              statusText = '投稿する';
              StatusIcon = Check;
              statusColor = 'text-[#00AFA8]';
            } else if (m === 'hold') {
              statusText = '保留';
              StatusIcon = Clock;
              statusColor = 'text-amber-400';
            } else if (m === 'skip') {
              statusText = '投稿しない';
              StatusIcon = X;
              statusColor = 'text-gray-500';
            }

            return (
              <>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-gray-200 px-1.5 py-0.5 rounded bg-[#21262d] border border-[#30363d]">
                      {c.id}
                    </span>
                    {c.severity && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                          c.severity === 'P1'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : c.severity === 'P2'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {c.severity}
                      </span>
                    )}
                  </div>

                  <div className={`flex items-center gap-1 text-[10.5px] font-medium ${statusColor}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusText}</span>
                  </div>
                </div>

                <p className="text-xs font-medium text-gray-200 line-clamp-2 leading-snug mb-1.5">
                  {c.title}
                </p>

                {c.path && (
                  <div className="text-[10px] font-mono text-gray-400 truncate border-t border-[#30363d]/60 pt-1">
                    {c.path.split('/').pop()}
                    {c.line ? `:${c.line}` : ''}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </nav>
  );
};
