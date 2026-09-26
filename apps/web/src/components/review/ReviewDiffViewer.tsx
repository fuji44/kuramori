import React, { useState, useMemo } from 'react';
import { Copy, Check, FileCode, Columns, AlignJustify } from 'lucide-react';
import { useI18n } from '../../i18n/context.tsx';

interface ReviewDiffViewerProps {
  snippet?: string;
  replacement?: string;
  startLine?: number;
}

interface DiffLine {
  type: 'context' | 'delete' | 'add';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

/**
 * 行単位の LCS（Longest Common Subsequence）により Unified Diff を算出
 */
function computeLineDiff(oldText: string, newText: string, startLine = 1): DiffLine[] {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  const m = oldLines.length;
  const n = newLines.length;

  if (m === 0 && n === 0) return [];
  if (m === 0) {
    return newLines.map((line, idx) => ({
      type: 'add',
      newLineNumber: startLine + idx,
      content: line,
    }));
  }
  if (n === 0) {
    return oldLines.map((line, idx) => ({
      type: 'delete',
      oldLineNumber: startLine + idx,
      content: line,
    }));
  }

  // DP table for LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build diff
  let i = m;
  let j = n;
  const reversed: { type: 'context' | 'delete' | 'add'; oldIdx?: number; newIdx?: number; content: string }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      reversed.push({ type: 'context', oldIdx: i - 1, newIdx: j - 1, content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ type: 'add', newIdx: j - 1, content: newLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      reversed.push({ type: 'delete', oldIdx: i - 1, content: oldLines[i - 1] });
      i--;
    }
  }

  reversed.reverse();

  let oldCounter = startLine;
  let newCounter = startLine;

  return reversed.map((item) => {
    if (item.type === 'context') {
      const line: DiffLine = {
        type: 'context',
        oldLineNumber: oldCounter++,
        newLineNumber: newCounter++,
        content: item.content,
      };
      return line;
    } else if (item.type === 'delete') {
      const line: DiffLine = {
        type: 'delete',
        oldLineNumber: oldCounter++,
        content: item.content,
      };
      return line;
    } else {
      const line: DiffLine = {
        type: 'add',
        newLineNumber: newCounter++,
        content: item.content,
      };
      return line;
    }
  });
}

export const ReviewDiffViewer: React.FC<ReviewDiffViewerProps> = ({
  snippet = '',
  replacement = '',
  startLine = 1,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'diff' | 'replacement'>('diff');

  const diffLines = useMemo(() => {
    return computeLineDiff(snippet.trimEnd(), replacement.trimEnd(), startLine);
  }, [snippet, replacement, startLine]);

  const handleCopyReplacement = async () => {
    try {
      await navigator.clipboard.writeText(replacement || snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const addedCount = diffLines.filter((l) => l.type === 'add').length;
  const deletedCount = diffLines.filter((l) => l.type === 'delete').length;

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden text-xs">
      {/* ツールバー */}
      <div className="bg-[#161b22] px-3.5 py-2 border-b border-[#30363d] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[#00AFA8] font-mono font-bold text-[11px]">
            <FileCode className="w-3.5 h-3.5" />
            {t('review.diff.title')}
          </span>
          <div className="flex items-center gap-1 font-mono text-[10.5px]">
            {addedCount > 0 && <span className="text-emerald-400 font-bold">+{addedCount}</span>}
            {deletedCount > 0 && <span className="text-rose-400 font-bold">-{deletedCount}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 表示モード切り替え */}
          {snippet && replacement && (
            <div className="inline-flex rounded-md bg-[#0d1117] p-0.5 border border-[#30363d] text-[10.5px]">
              <button
                type="button"
                onClick={() => setViewMode('diff')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  viewMode === 'diff'
                    ? 'bg-[#21262d] text-white font-bold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t('review.diff.diffMode')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('replacement')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  viewMode === 'replacement'
                    ? 'bg-[#21262d] text-white font-bold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t('review.diff.replacementOnlyMode')}
              </button>
            </div>
          )}

          {/* コピーボタン */}
          <button
            type="button"
            onClick={handleCopyReplacement}
            title={t('review.diff.copyCodeTooltip')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white border border-[#30363d] text-[11px] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">{t('review.diff.copiedCode')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>{t('review.diff.copyCode')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* コード表示エリア */}
      {viewMode === 'diff' ? (
        <div className="overflow-x-auto font-mono text-[11px] leading-5 divide-y divide-[#30363d]/20">
          <table className="w-full border-collapse">
            <tbody>
              {diffLines.map((line, idx) => {
                let rowBg = 'hover:bg-[#161b22]/50';
                let signColor = 'text-gray-500';
                let contentColor = 'text-gray-200';
                let sign = ' ';

                if (line.type === 'delete') {
                  rowBg = 'bg-rose-950/30 text-rose-200 hover:bg-rose-950/40';
                  signColor = 'text-rose-400 font-bold';
                  contentColor = 'text-rose-200';
                  sign = '-';
                } else if (line.type === 'add') {
                  rowBg = 'bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40';
                  signColor = 'text-emerald-400 font-bold';
                  contentColor = 'text-emerald-200';
                  sign = '+';
                }

                return (
                  <tr key={idx} className={`transition-colors ${rowBg}`}>
                    {/* 旧行番号 */}
                    <td className="w-10 px-2 text-right select-none text-gray-600 border-r border-[#30363d]/40 text-[10.5px]">
                      {line.oldLineNumber ?? ''}
                    </td>
                    {/* 新行番号 */}
                    <td className="w-10 px-2 text-right select-none text-gray-600 border-r border-[#30363d]/40 text-[10.5px]">
                      {line.newLineNumber ?? ''}
                    </td>
                    {/* 符号 (+ / -) */}
                    <td className={`w-6 px-1.5 text-center select-none ${signColor}`}>
                      {sign}
                    </td>
                    {/* コード本文 */}
                    <td className={`px-2 py-0.5 whitespace-pre overflow-x-auto ${contentColor}`}>
                      {line.content || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-3 bg-[#0d1117] overflow-x-auto font-mono text-[11px] leading-5 text-emerald-200">
          <pre className="m-0 whitespace-pre">
            {replacement || snippet}
          </pre>
        </div>
      )}
    </div>
  );
};
