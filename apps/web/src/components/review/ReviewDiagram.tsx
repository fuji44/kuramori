import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Code,
  Command,
  Sparkles,
  ArrowRight,
  MessageSquareCode,
  Layers,
  Maximize2,
  Minimize2,
  Columns,
  Rows,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  Loader2,
  Layout,
  AlertCircle,
} from 'lucide-react';
import type { Diagram, DiagramNode, ReviewComment } from '@kuramori/core';

interface ReviewDiagramProps {
  diagram?: Diagram;
  comments?: ReviewComment[];
  onSelectNode?: (nodeId: string) => void;
  relatedCommentIds?: string[];
}

export const ReviewDiagram: React.FC<ReviewDiagramProps> = ({
  diagram,
  comments = [],
  onSelectNode,
  relatedCommentIds = [],
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showSource, setShowSource] = useState<boolean>(false);
  const [showWheelHint, setShowWheelHint] = useState<boolean>(false);

  // 指摘ハイライト制御ステート（ホバープレビュー & クリック固定化）
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [pinnedCommentId, setPinnedCommentId] = useState<string | null>(null);

  // レイアウトエンジン切り替えステート
  const [currentLayout, setCurrentLayout] = useState<'tala' | 'elk' | 'dagre'>('tala');
  const [svgCache, setSvgCache] = useState<Record<string, string>>(() => ({
    tala: diagram?.svg || '',
  }));
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string | null>(null);

  // 表示制御ステート
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'split' | 'stacked'>('split');
  const [showCommentsPanel, setShowCommentsPanel] = useState<boolean>(true);

  const hintTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Esc キーで全画面表示を解除
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // 全画面表示時のスクロール抑制
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // diagram.svg が更新された際にキャッシュを同期
  useEffect(() => {
    if (diagram?.svg) {
      setSvgCache((prev) => ({
        ...prev,
        tala: prev.tala || diagram.svg || '',
        [currentLayout]: prev[currentLayout] || diagram.svg || '',
      }));
    }
  }, [diagram?.svg, currentLayout]);

  const compileLayout = useCallback(
    async (targetLayout: 'tala' | 'elk' | 'dagre') => {
      const source = diagram?.d2Source;
      if (!source) return;

      setIsCompiling(true);
      setCompileError(null);
      try {
        const res = await fetch('/api/diagram/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            d2Source: source,
            layout: targetLayout,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        if (json.svg) {
          setSvgCache((prev) => ({ ...prev, [targetLayout]: json.svg }));
        } else {
          throw new Error(json.error || 'SVG の生成に失敗しました');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setCompileError(`レイアウト生成に失敗しました: ${message}`);
      } finally {
        setIsCompiling(false);
      }
    },
    [diagram?.d2Source]
  );

  // レイアウトエンジン切り替えハンドラー
  const handleLayoutChange = async (newLayout: 'tala' | 'elk' | 'dagre') => {
    if (newLayout === currentLayout) return;
    setCurrentLayout(newLayout);
    setCompileError(null);

    if (svgCache[newLayout]) {
      return;
    }

    await compileLayout(newLayout);
  };

  // SVG が未生成かつ D2 ソースが存在する場合は自動コンパイル
  useEffect(() => {
    if (!diagram?.svg && diagram?.d2Source && !svgCache[currentLayout] && !isCompiling && !compileError) {
      compileLayout(currentLayout);
    }
  }, [diagram?.svg, diagram?.d2Source, currentLayout, svgCache, isCompiling, compileError, compileLayout]);

  // 現在のレイアウトに対応する SVG 文字列
  const currentRawSvg = svgCache[currentLayout] || diagram?.svg || '';

  // SVG 内の XML 宣言を除去し、白背景 rect を透明化、ノード・エッジにデータ属性を付与
  const cleanSvg = useMemo(() => {
    if (!currentRawSvg) return '';
    let s = currentRawSvg.replace(/<\?xml[\s\S]*?\?>/, '').trim();

    // D2 のキャンバス背景 rect（fill-N7 または最外層直後の rect）を透明化
    s = s.replace(
      /(<rect\s+[^>]*?class="[^"]*?fill-N7[^"]*?"[^>]*?fill=")[^"]+(")/,
      '$1transparent$2'
    );
    s = s.replace(
      /(<svg[^>]*?>\s*<svg[^>]*?>\s*<rect\s+[^>]*?fill=")[^"]+(")/,
      '$1transparent$2'
    );

    // ノードとエッジに data-node-id / data-edge-from / data-edge-to を付与
    s = s.replace(/<g class="([A-Za-z0-9+/=]+)">/g, (match, b64) => {
      try {
        const decoded = atob(b64);
        const edgeMatch = decoded.match(/^\((.+?)\s*-&gt;\s*(.+?)\)\[\d+\]$/);
        if (edgeMatch) {
          return `<g class="${b64} d2-edge" data-edge-from="${edgeMatch[1]}" data-edge-to="${edgeMatch[2]}">`;
        }
        return `<g class="${b64} d2-node" data-node-id="${decoded}">`;
      } catch {
        return match;
      }
    });

    // 最外層 svg のアスペクト比設定
    if (!s.includes('preserveAspectRatio')) {
      s = s.replace(/<svg\s+/, '<svg preserveAspectRatio="xMidYMid meet" ');
    }
    return s;
  }, [currentRawSvg]);

  // ダイアグラムに関連する指摘の一覧を抽出・集約
  const diagramComments = useMemo(() => {
    if (!diagram?.nodes || diagram.nodes.length === 0) {
      return [];
    }

    const commentToNodesMap = new Map<string, DiagramNode[]>();

    for (const node of diagram.nodes) {
      const cids = new Set<string>();
      if (node.commentId) cids.add(node.commentId);
      if (node.commentIds) {
        for (const cid of node.commentIds) cids.add(cid);
      }

      for (const c of comments) {
        const path = c.path || c.location?.path || '';
        const lowerPath = path.toLowerCase();
        const lowerId = node.id.toLowerCase();
        if (
          lowerPath.includes(lowerId) ||
          c.title.toLowerCase().includes(lowerId) ||
          c.body.toLowerCase().includes(lowerId)
        ) {
          cids.add(c.id);
        }
      }

      for (const cid of cids) {
        const list = commentToNodesMap.get(cid) || [];
        if (!list.some((n) => n.id === node.id)) {
          list.push(node);
        }
        commentToNodesMap.set(cid, list);
      }
    }

    for (const cid of relatedCommentIds) {
      if (!commentToNodesMap.has(cid)) {
        commentToNodesMap.set(cid, []);
      }
    }

    const result: Array<{
      comment: ReviewComment;
      nodes: DiagramNode[];
    }> = [];

    const commentMap = new Map(comments.map((c) => [c.id, c]));

    for (const [cid, nodes] of commentToNodesMap.entries()) {
      const c = commentMap.get(cid);
      if (c) {
        result.push({ comment: c, nodes });
      }
    }

    return result.sort((a, b) => {
      const numA = parseInt(a.comment.id.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.comment.id.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [diagram?.nodes, comments, relatedCommentIds]);

  // フィルタ等で固定化中の指摘が非表示になった場合はピン留めを自動解除
  useEffect(() => {
    if (pinnedCommentId && !diagramComments.some((dc) => dc.comment.id === pinnedCommentId)) {
      setPinnedCommentId(null);
    }
  }, [diagramComments, pinnedCommentId]);

  // ネイティブな non-passive wheel リスナーで Ctrl/Cmd 押下時のみズーム
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.15 : 0.87;
        setScale((s) => Math.min(Math.max(s * delta, 0.35), 4));
      } else {
        setShowWheelHint(true);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = window.setTimeout(() => {
          setShowWheelHint(false);
        }, 1200);
      }
    };

    el.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelEvent);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  // SVG 内のエレメントハイライト更新ロジック
  const applySvgHighlights = useCallback(
    (targetNodeIds: string[]) => {
      const el = containerRef.current;
      if (!el) return;

      if (targetNodeIds.length === 0) {
        el.classList.remove('has-d2-hover');
        el.querySelectorAll('.is-active, .is-target, .is-connected').forEach((item) => {
          item.classList.remove('is-active', 'is-target', 'is-connected');
        });
        return;
      }

      el.classList.add('has-d2-hover');

      el.querySelectorAll('.is-active, .is-target, .is-connected').forEach((item) => {
        item.classList.remove('is-active', 'is-target', 'is-connected');
      });

      const allTargetNodeIds = new Set<string>();
      const connectedEdgeFromTo = new Set<string>();

      const nodeElements = el.querySelectorAll('.d2-node');
      nodeElements.forEach((nodeEl) => {
        const rawNodeId = nodeEl.getAttribute('data-node-id');
        if (!rawNodeId) return;

        const isMatch = targetNodeIds.some(
          (t) => rawNodeId === t || rawNodeId.endsWith(`.${t}`) || t.endsWith(`.${rawNodeId}`)
        );

        if (isMatch) {
          nodeEl.classList.add('is-active');
          allTargetNodeIds.add(rawNodeId);
        }
      });

      const edges = el.querySelectorAll('.d2-edge');
      edges.forEach((edgeEl) => {
        const from = edgeEl.getAttribute('data-edge-from');
        const to = edgeEl.getAttribute('data-edge-to');
        if (!from || !to) return;

        const fromMatched = Array.from(allTargetNodeIds).some(
          (nid) => from === nid || from.endsWith(`.${nid}`) || nid.endsWith(`.${from}`)
        );
        const toMatched = Array.from(allTargetNodeIds).some(
          (nid) => to === nid || to.endsWith(`.${nid}`) || nid.endsWith(`.${to}`)
        );

        if (fromMatched || toMatched) {
          edgeEl.classList.add('is-connected');
          if (fromMatched && !toMatched) connectedEdgeFromTo.add(to);
          if (toMatched && !fromMatched) connectedEdgeFromTo.add(from);
        }
      });

      nodeElements.forEach((nodeEl) => {
        const rawNodeId = nodeEl.getAttribute('data-node-id');
        if (!rawNodeId) return;
        const isConnectedTarget = Array.from(connectedEdgeFromTo).some(
          (cid) => rawNodeId === cid || rawNodeId.endsWith(`.${cid}`) || cid.endsWith(`.${rawNodeId}`)
        );
        if (isConnectedTarget && !nodeEl.classList.contains('is-active')) {
          nodeEl.classList.add('is-target');
        }
      });
    },
    []
  );

  // 指摘連動ハイライト（ホバー中が最優先、ホバーが無ければピン留め中の指摘をハイライト）
  const activeHighlightCommentId = hoveredCommentId ?? pinnedCommentId;

  useEffect(() => {
    if (!activeHighlightCommentId) {
      applySvgHighlights([]);
      return;
    }

    const item = diagramComments.find((dc) => dc.comment.id === activeHighlightCommentId);
    if (item && item.nodes.length > 0) {
      applySvgHighlights(item.nodes.map((n) => n.id));
    } else {
      applySvgHighlights([]);
    }
  }, [activeHighlightCommentId, diagramComments, applySvgHighlights]);

  if (!diagram || (!diagram.svg && !diagram.d2Source && (!diagram.nodes || diagram.nodes.length === 0))) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 text-center text-gray-400 text-xs">
        アーキテクチャ・モジュール関係図情報はありません。
      </div>
    );
  }

  const handleZoomIn = () => setScale((s) => Math.min(s * 1.25, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.25, 0.35));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'a') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // SVG 内ノードクリック時に該当指摘のハイライトを固定化（ピン留め）
  const handleSvgClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.d2-node') as HTMLElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      if (nodeId) {
        const baseId = nodeId.includes('.') ? nodeId.split('.').pop()! : nodeId;
        const matched = diagramComments.find((dc) =>
          dc.nodes.some((n) => n.id === baseId || n.id === nodeId)
        );
        if (matched) {
          setPinnedCommentId((prev) => (prev === matched.comment.id ? null : matched.comment.id));
        }
      }
    }
  };

  // 指摘カード要素の描画コンポーネント
  const renderCommentCards = () => {
    if (diagramComments.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-center p-4 text-xs text-gray-500">
          現在のフィルタ条件に一致する指摘はありません
        </div>
      );
    }

    return diagramComments.map(({ comment, nodes }) => {
      const isPinned = pinnedCommentId === comment.id;
      const isHovered = hoveredCommentId === comment.id;

      const sev = (comment.severity || 'P2').toUpperCase();
      const sevColor =
        sev === 'P1'
          ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
          : sev === 'P3'
          ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
          : 'bg-amber-500/15 text-amber-300 border-amber-500/40';

      return (
        <div
          key={comment.id}
          onMouseEnter={() => setHoveredCommentId(comment.id)}
          onMouseLeave={() => setHoveredCommentId(null)}
          onClick={() => {
            // カード本体クリック: ハイライトを固定化（トグル）
            setPinnedCommentId((prev) => (prev === comment.id ? null : comment.id));
          }}
          className={`group p-2.5 rounded-lg border transition-all cursor-pointer text-left relative ${
            isPinned
              ? 'bg-[#00AFA8]/20 border-[#00AFA8] shadow-md shadow-[#00AFA8]/15 ring-1 ring-[#00AFA8]/50'
              : isHovered
              ? 'bg-[#00AFA8]/10 border-[#00AFA8]/60 shadow-sm'
              : 'bg-[#161b22] border-[#30363d]/70 hover:border-gray-500/60 hover:bg-[#21262d]'
          }`}
          title={isPinned ? 'クリックでハイライト固定を解除' : 'クリックでハイライトを固定'}
        >
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#21262d] text-gray-300 border border-[#30363d]">
                {comment.id}
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${sevColor}`}>
                {sev}
              </span>
              {comment.tag && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] text-gray-300 font-mono border border-[#30363d]">
                  {comment.tag}
                </span>
              )}
              {isPinned && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00AFA8] text-black">
                  <Pin className="w-2.5 h-2.5 fill-current" />
                  <span>固定中</span>
                </span>
              )}
            </div>

            {/* → アイコンボタン: これを押したときだけ指摘の詳細までスクロールジャンプ */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // カード全体のクリック（固定化）を発火させない
                onSelectNode?.(comment.id);
                if (isFullscreen) {
                  setIsFullscreen(false);
                }
              }}
              title="指摘の詳細へジャンプ"
              className="p-1 rounded-md text-gray-400 hover:text-[#00AFA8] hover:bg-[#0d1117] transition-all group-hover:text-gray-200"
            >
              <ArrowRight className="w-4 h-4 hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="text-xs font-semibold text-gray-200 line-clamp-2 leading-snug mb-1.5 group-hover:text-white">
            {comment.title}
          </div>

          {nodes.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-[#30363d]/50">
              <span className="text-[10px] text-gray-400 font-medium">影響モジュール:</span>
              {nodes.map((n) => (
                <span
                  key={n.id}
                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#0d1117] text-teal-300 border border-[#30363d]"
                >
                  {n.label || n.id}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <figure
      className={`bg-[#161b22] border border-[#30363d] rounded-2xl shadow-sm space-y-3 m-0 transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-0 p-5 bg-[#0d1117] flex flex-col h-screen overflow-hidden'
          : 'p-5 w-full'
      }`}
    >
      <style>{`
        @keyframes d2-dash-flow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .d2-edge.is-connected path.connection {
          stroke: #00AFA8 !important;
          stroke-width: 3.5px !important;
          stroke-dasharray: 6 3 !important;
          animation: d2-dash-flow 0.5s linear infinite !important;
          filter: drop-shadow(0 0 6px rgba(0, 175, 168, 0.8)) !important;
        }
        .d2-edge.is-connected marker path,
        .d2-edge.is-connected marker polygon {
          fill: #00AFA8 !important;
          stroke: #00AFA8 !important;
        }
        .d2-node.is-active > .shape > * {
          stroke: #00AFA8 !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 10px rgba(0, 175, 168, 0.85)) !important;
        }
        .d2-node.is-target > .shape > * {
          stroke: #38bdf8 !important;
          stroke-width: 2.5px !important;
          filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.7)) !important;
        }
        .has-d2-hover .d2-node:not(.is-active):not(.is-target):not([data-node-id="usecases"]):not([data-node-id="services"]):not([data-node-id="storage"]):not([data-node-id="other"]),
        .has-d2-hover .d2-edge:not(.is-connected) {
          opacity: 0.22 !important;
          transition: opacity 0.2s ease;
        }
      `}</style>

      {/* ツールバー */}
      <div className="flex items-center justify-between border-b border-[#30363d]/80 pb-2.5 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#00AFA8]/15 text-[#00AFA8]">
            影響範囲
          </span>
          <span className="text-sm font-semibold text-gray-100 flex items-center gap-1.5">
            <Network className="w-4 h-4 text-[#00AFA8]" />
            モジュール関連・アーキテクチャ図
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#00AFA8] font-medium bg-[#00AFA8]/10 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            指摘ホバーでハイライト連動
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* レイアウトエンジン切り替えボタングループ */}
          <div className="flex items-center gap-0.5 bg-[#0d1117] p-0.5 rounded-lg border border-[#30363d]">
            <span className="text-[10px] font-semibold text-gray-400 px-1.5 flex items-center gap-1">
              <Layout className="w-3 h-3 text-[#00AFA8]" />
              <span className="hidden sm:inline">配置:</span>
            </span>
            {(['tala', 'elk', 'dagre'] as const).map((l) => {
              const labels = { tala: 'TALA (標準)', elk: 'ELK (整列)', dagre: 'DAGRE (階層)' };
              const active = currentLayout === l;
              return (
                <button
                  key={l}
                  type="button"
                  disabled={isCompiling}
                  onClick={() => handleLayoutChange(l)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-[#00AFA8]/20 text-[#00AFA8] font-bold border border-[#00AFA8]/40 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#21262d] border border-transparent'
                  } ${isCompiling ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={`${labels[l]} レイアウトエンジンに切り替え`}
                >
                  {l.toUpperCase()}
                </button>
              );
            })}
          </div>

          <span className="w-px h-4 bg-[#30363d] mx-0.5 hidden sm:inline-block" />

          {/* レイアウト切り替え（横並び / 縦並び） */}
          <button
            onClick={() => setLayoutMode((m) => (m === 'split' ? 'stacked' : 'split'))}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 border ${
              layoutMode === 'stacked'
                ? 'bg-[#00AFA8]/20 text-[#00AFA8] border-[#00AFA8]/40'
                : 'bg-[#21262d] text-gray-400 hover:text-gray-200 border-[#30363d]'
            }`}
            title={layoutMode === 'split' ? '縦並び（図を全幅化）に切り替え' : '横並び（左右分割）に切り替え'}
          >
            {layoutMode === 'split' ? <Rows className="w-3.5 h-3.5" /> : <Columns className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">
              {layoutMode === 'split' ? '縦並び' : '横並び'}
            </span>
          </button>

          {/* 指摘パネル表示・非表示トグル */}
          <button
            onClick={() => setShowCommentsPanel((v) => !v)}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 border ${
              showCommentsPanel
                ? 'bg-[#21262d] text-gray-300 hover:text-white border-[#30363d]'
                : 'bg-[#00AFA8]/20 text-[#00AFA8] border-[#00AFA8]/40'
            }`}
            title={showCommentsPanel ? '指摘一覧を非表示にして図を最大幅にする' : '指摘一覧を表示'}
          >
            {showCommentsPanel ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">
              {showCommentsPanel ? '指摘隠す' : '指摘表示'}
            </span>
          </button>

          <span className="w-px h-4 bg-[#30363d] mx-0.5 hidden sm:inline-block" />

          {/* 定義ソースコード表示 */}
          {diagram.d2Source && (
            <button
              onClick={() => setShowSource(!showSource)}
              className={`px-2 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 font-mono border ${
                showSource
                  ? 'bg-[#00AFA8]/20 text-[#00AFA8] border-[#00AFA8]/40'
                  : 'bg-[#21262d] text-gray-400 hover:text-gray-200 border-[#30363d]'
              }`}
              title="図の定義ソースコード表示切替"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="text-[11px]">定義</span>
            </button>
          )}

          {/* 拡大 / 縮小 / リセット */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg border border-[#30363d]"
            title="拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg border border-[#30363d]"
            title="縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg border border-[#30363d]"
            title="位置・倍率をリセット"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-[#30363d] mx-0.5" />

          {/* 全画面（最大化）トグルボタン */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 border ${
              isFullscreen
                ? 'bg-[#00AFA8] text-black border-[#00AFA8] font-bold'
                : 'bg-[#21262d] hover:bg-[#30363d] text-gray-300 border-[#30363d]'
            }`}
            title={isFullscreen ? '全画面を解除 (Esc)' : '図を全画面（最大化）表示'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isFullscreen ? '縮小' : '全画面'}</span>
          </button>
        </div>
      </div>

      {compileError && (
        <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{compileError}</span>
        </div>
      )}

      {showSource && diagram.d2Source && (
        <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] font-mono text-xs text-gray-300 overflow-x-auto max-h-48 shrink-0">
          <pre>{diagram.d2Source}</pre>
        </div>
      )}

      {/* メイン描画エリア */}
      {layoutMode === 'split' && showCommentsPanel ? (
        /* 横並び（左右スプリット）モード */
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
          {/* 左側: SVG 描画キャンバス */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleSvgClick}
            className={`lg:col-span-8 xl:col-span-8 bg-[#0d1117] rounded-xl border border-[#30363d]/60 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${
              isFullscreen ? 'h-full min-h-[500px]' : 'h-[520px]'
            }`}
          >
            {isCompiling && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="px-4 py-2.5 rounded-xl bg-[#161b22] border border-[#00AFA8]/40 text-xs font-semibold text-[#00AFA8] flex items-center gap-2.5 shadow-xl animate-in fade-in">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00AFA8]" />
                  <span>レイアウト再計算中 ({currentLayout.toUpperCase()})...</span>
                </div>
              </div>
            )}

            {cleanSvg ? (
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                }}
                className="w-full h-full flex items-center justify-center p-4 [&>svg]:w-auto [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:block pointer-events-auto"
                dangerouslySetInnerHTML={{ __html: cleanSvg }}
              />
            ) : (
              <div className="text-gray-400 text-xs">SVG レンダリング情報がありません。</div>
            )}

            {showWheelHint && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none transition-opacity animate-in fade-in duration-100">
                <div className="px-4 py-2 rounded-xl bg-[#161b22]/90 border border-[#30363d] text-xs font-semibold text-gray-200 flex items-center gap-2 shadow-lg">
                  <Command className="w-3.5 h-3.5 text-[#00AFA8]" />
                  <span>⌘ / Ctrl + スクロールで図を拡大縮小</span>
                </div>
              </div>
            )}
          </div>

          {/* 右側: 関連指摘一覧サイドパネル */}
          <div
            className={`lg:col-span-4 xl:col-span-4 bg-[#0d1117]/90 rounded-xl border border-[#30363d]/70 flex flex-col overflow-hidden ${
              isFullscreen ? 'h-full' : 'h-[520px]'
            }`}
          >
            <div className="p-3 border-b border-[#30363d]/70 bg-[#161b22]/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <MessageSquareCode className="w-4 h-4 text-[#00AFA8]" />
                <span className="text-xs font-bold text-gray-200">関連する指摘</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFA8]/20 text-[#00AFA8]">
                  {diagramComments.length}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-gray-400" />
                クリックで固定
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">{renderCommentCards()}</div>
          </div>
        </div>
      ) : (
        /* 縦並び（図が100%全幅）モード、または指摘非表示モード */
        <div className={`flex flex-col gap-3.5 ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
          {/* 図キャンバス（100% 全幅） */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleSvgClick}
            className={`w-full bg-[#0d1117] rounded-xl border border-[#30363d]/60 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${
              isFullscreen ? (showCommentsPanel ? 'h-[65vh]' : 'flex-1 h-full') : 'h-[520px]'
            }`}
          >
            {isCompiling && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="px-4 py-2.5 rounded-xl bg-[#161b22] border border-[#00AFA8]/40 text-xs font-semibold text-[#00AFA8] flex items-center gap-2.5 shadow-xl animate-in fade-in">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00AFA8]" />
                  <span>レイアウト再計算中 ({currentLayout.toUpperCase()})...</span>
                </div>
              </div>
            )}

            {cleanSvg ? (
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                }}
                className="w-full h-full flex items-center justify-center p-4 [&>svg]:w-auto [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:block pointer-events-auto"
                dangerouslySetInnerHTML={{ __html: cleanSvg }}
              />
            ) : (
              <div className="text-gray-400 text-xs">SVG レンダリング情報がありません。</div>
            )}

            {showWheelHint && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none transition-opacity animate-in fade-in duration-100">
                <div className="px-4 py-2 rounded-xl bg-[#161b22]/90 border border-[#30363d] text-xs font-semibold text-gray-200 flex items-center gap-2 shadow-lg">
                  <Command className="w-3.5 h-3.5 text-[#00AFA8]" />
                  <span>⌘ / Ctrl + スクロールで図を拡大縮小</span>
                </div>
              </div>
            )}
          </div>

          {/* 下部: 関連指摘グリッドパネル（表示設定時のみ） */}
          {showCommentsPanel && (
            <div className="w-full bg-[#0d1117]/90 rounded-xl border border-[#30363d]/70 flex flex-col overflow-hidden shrink-0">
              <div className="p-2.5 px-3.5 border-b border-[#30363d]/70 bg-[#161b22]/70 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquareCode className="w-4 h-4 text-[#00AFA8]" />
                  <span className="text-xs font-bold text-gray-200">関連する指摘</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00AFA8]/20 text-[#00AFA8]">
                    {diagramComments.length}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">クリックでハイライト固定</span>
              </div>
              <div className="p-2.5 max-h-[260px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {renderCommentCards()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 凡例フッターストリップ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d]/70 text-[11px] text-gray-300 shrink-0">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-gray-400 font-semibold text-[10.5px] uppercase tracking-wider">凡例:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#3b1717] border border-[#f43f5e]" />
            <span>変更・指摘対象 (Modified)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#134e4a] border border-[#00AFA8]" />
            <span>中核サービス (Service)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#292524] border border-[#f59e0b]" />
            <span>永続層・DB (Repository)</span>
          </div>
        </div>
        <div className="text-gray-400 text-[10.5px] flex items-center gap-3">
          <span>ホバー: プレビュー</span>
          <span>カードクリック: 固定化</span>
          <span>→ ボタン: 指摘詳細へジャンプ</span>
          {isFullscreen && <span className="text-[#00AFA8]">Esc: 全画面解除</span>}
        </div>
      </div>
    </figure>
  );
};
