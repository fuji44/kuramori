import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface ReviewExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportText: string;
}

export const ReviewExportModal: React.FC<ReviewExportModalProps> = ({
  isOpen,
  onClose,
  exportText,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-4 w-full max-w-3xl max-h-[85vh] p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-100">判断の書き出し</h3>
            {copied && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> コピーしました！
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-400">
          投稿マークが付いた指摘とメモを Markdown 形式で出力しています。PR レビューのコメント欄や AI agent への引き継ぎに利用できます。
        </p>

        <textarea
          readOnly
          value={exportText}
          className="flex-1 min-h-[320px] p-4 rounded-xl border border-[#30363d] bg-[#0d1117] text-gray-200 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:border-[#00AFA8]"
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-gray-300 hover:text-white bg-[#21262d] hover:bg-[#30363d] transition-colors"
          >
            とじる
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-black bg-[#ECEDF0] hover:bg-white flex items-center gap-1.5 transition-all shadow-md"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>コピーする</span>
          </button>
        </div>
      </div>
    </div>
  );
};
