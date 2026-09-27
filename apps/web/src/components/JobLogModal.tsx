import type React from 'react';
import { X, AlertCircle, RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n/context.tsx';

interface JobLogModalProps {
  jobId: string | null;
  error: string | null;
  content: string | null;
  loading: boolean;
  onClose: () => void;
}

export function JobLogModal({
  jobId,
  error,
  content,
  loading,
  onClose,
}: JobLogModalProps) {
  const { t } = useI18n();

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>{t('jobLog.title')}</span>
            <span className="text-xs font-mono text-[#8b949e] bg-[#21262d] px-2 py-0.5 rounded">
              {jobId}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            title={t('jobLog.close')}
            className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-rose-200 mb-0.5">{t('jobLog.errorDetails')}</div>
              <div className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-rose-300/90">{error}</div>
            </div>
          </div>
        )}
        <div className="p-6 flex-1 overflow-y-auto font-mono text-xs text-[#c9d1d9] bg-[#0d1117] whitespace-pre-wrap leading-relaxed">
          {loading ? (
            <div className="flex items-center gap-2 text-[#8b949e]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t('jobLog.loadingLog')}</span>
            </div>
          ) : (
            content || t('jobLog.noLog')
          )}
        </div>
      </div>
    </div>
  );
}
