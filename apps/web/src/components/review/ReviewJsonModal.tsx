import type React from 'react';
import { useState, useMemo } from 'react';
import { X, Copy, Check, Download, ExternalLink, FileCode } from 'lucide-react';
import type { ReviewReportData } from '@kuramori/core';
import { useI18n } from '../../i18n/context.tsx';

interface ReviewJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReviewReportData;
  reportId: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightJsonLine(line: string): string {
  const escaped = escapeHtml(line);
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      // キー名 ("key":)
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          const keyPart = match.slice(0, -1);
          return `<span class="text-[#7ee787] font-semibold">${keyPart}</span>:`;
        }
        // 文字列値 ("val")
        return `<span class="text-[#a5d6ff]">${match}</span>`;
      }
      // 真偽値
      if (/^(true|false)$/.test(match)) {
        return `<span class="text-[#ff7b72] font-semibold">${match}</span>`;
      }
      // null
      if (match === 'null') {
        return `<span class="text-[#ffa657] font-semibold italic">${match}</span>`;
      }
      // 数値
      return `<span class="text-[#79c0ff]">${match}</span>`;
    }
  );
}

export const ReviewJsonModal: React.FC<ReviewJsonModalProps> = ({
  isOpen,
  onClose,
  data,
  reportId,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState<boolean>(false);

  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return '';
    }
  }, [data]);

  const sizeKb = useMemo(() => {
    return (new TextEncoder().encode(jsonString).length / 1024).toFixed(1);
  }, [jsonString]);

  const highlightedLines = useMemo(() => {
    return jsonString.split('\n').map((line, idx) => ({
      lineNum: idx + 1,
      html: highlightJsonLine(line),
    }));
  }, [jsonString]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `review-report-${data.pr?.repo ? `${data.pr.repo.replace('/', '-')}-` : ''}${data.pr?.number ?? reportId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // fallback
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#161b22] border border-[#30363d] shadow-2xl overflow-hidden"
      >
        {/* モーダルヘッダー */}
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between gap-4 bg-[#21262d]/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-[#00AFA8]/15 text-[#00AFA8] border border-[#00AFA8]/30">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <span>{t('review.jsonModal.title')}</span>
                {data.pr?.number && (
                  <span className="font-mono text-xs text-[#00AFA8]">#{data.pr.number}</span>
                )}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                <span>{sizeKb} KB</span>
                <span>·</span>
                <span>{t('review.jsonModal.linesCount', { count: highlightedLines.length })}</span>
                <span>·</span>
                <span>{t('review.jsonModal.findingsCount', { count: data.comments?.length ?? 0 })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* クリップボードコピーボタン */}
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#21262d] hover:bg-[#30363d] text-gray-200 border-[#30363d]'
              }`}
              title={t('review.jsonModal.copy')}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('review.jsonModal.copied') : t('review.jsonModal.copy')}</span>
            </button>

            {/* ダウンロードボタン */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] transition-colors"
              title={t('review.jsonModal.download')}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('review.jsonModal.download')}</span>
            </button>

            {/* Raw JSON リンク */}
            <a
              href={`/api/reports/${reportId}/data`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] transition-colors"
              title="Raw JSON"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('review.jsonModal.raw')}</span>
            </a>

            <div className="w-px h-5 bg-[#30363d] mx-1" />

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#21262d] transition-colors"
              title={t('review.jsonModal.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* シンタックスハイライト凡例ストリップ */}
        <div className="px-6 py-2 bg-[#12161c] border-b border-[#30363d]/60 flex items-center gap-4 text-[10.5px] font-mono shrink-0 select-none overflow-x-auto">
          <span className="text-gray-400 uppercase tracking-wider font-semibold">{t('review.jsonModal.legend')}</span>
          <span className="flex items-center gap-1 text-[#7ee787]">
            <span className="w-2 h-2 rounded-full bg-[#7ee787]/80" /> key
          </span>
          <span className="flex items-center gap-1 text-[#a5d6ff]">
            <span className="w-2 h-2 rounded-full bg-[#a5d6ff]/80" /> string
          </span>
          <span className="flex items-center gap-1 text-[#79c0ff]">
            <span className="w-2 h-2 rounded-full bg-[#79c0ff]/80" /> number
          </span>
          <span className="flex items-center gap-1 text-[#ff7b72]">
            <span className="w-2 h-2 rounded-full bg-[#ff7b72]/80" /> boolean
          </span>
          <span className="flex items-center gap-1 text-[#ffa657]">
            <span className="w-2 h-2 rounded-full bg-[#ffa657]/80" /> null
          </span>
        </div>

        {/* モーダル本文: シンタックスハイライト ＋ 行番号付きコードビュー */}
        <div className="flex-1 min-h-0 p-4 bg-[#0d1117] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto rounded-xl bg-[#161b22] border border-[#30363d] font-mono text-[11.5px] leading-relaxed scrollbar-thin">
            <table className="w-full border-collapse">
              <tbody>
                {highlightedLines.map((item) => (
                  <tr key={item.lineNum} className="hover:bg-[#21262d]/60 transition-colors">
                    <td className="w-12 py-0.5 px-3 text-right text-gray-400 select-none border-r border-[#30363d]/60 text-[10.5px] align-top bg-[#161b22]/90 sticky left-0">
                      {item.lineNum}
                    </td>
                    <td className="py-0.5 px-4 text-gray-300 select-text whitespace-pre overflow-x-visible align-top font-mono">
                      {
                        // deno-lint-ignore react-no-danger
                        <span dangerouslySetInnerHTML={{ __html: item.html }} />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* モーダルフッター */}
        <div className="px-6 py-3 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span className="font-mono text-[11px]">
            API: <code className="text-[#00AFA8]">GET /api/reports/{reportId}/data</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors"
          >
            {t('review.jsonModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
