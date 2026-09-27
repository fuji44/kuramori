import { useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReviewItem } from '../types.ts';
import { ReviewReportView } from '../components/review/ReviewReportView.tsx';
import { useI18n } from '../i18n/context.tsx';

interface ReportDetailViewProps {
  reportId: string;
  items: ReviewItem[];
  onBack: () => void;
  onSelectReport: (reportId: string, prTitle: string) => void;
}

export function ReportDetailView({
  reportId,
  items,
  onBack,
  onSelectReport,
}: ReportDetailViewProps) {
  const { t } = useI18n();

  // List of items that have a report, for prev/next navigation
  const reportItems = useMemo(() => {
    return items.filter((item) => Boolean(item.report?.id));
  }, [items]);

  const currentReportIndex = useMemo(() => {
    return reportItems.findIndex((item) => item.report?.id === reportId);
  }, [reportItems, reportId]);

  const currentItem = currentReportIndex >= 0 ? reportItems[currentReportIndex] : null;
  const prevReport = currentReportIndex > 0 ? reportItems[currentReportIndex - 1] : null;
  const nextReport =
    currentReportIndex >= 0 && currentReportIndex < reportItems.length - 1
      ? reportItems[currentReportIndex + 1]
      : null;

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#0d1117] overflow-hidden">
      {/* Review Workspace Top Navigation Bar */}
      <div className="h-12 border-b border-[#30363d] px-4 sm:px-6 flex items-center justify-between bg-[#161b22] shrink-0 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-medium border border-[#30363d] transition-colors"
            title={t('reportDetail.backTooltip')}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00AFA8]" />
            <span>{t('reportDetail.backBtn')}</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono bg-[#0d1117] text-gray-400 rounded border border-[#30363d]">
              Esc
            </kbd>
          </button>

          <div className="h-4 w-px bg-[#30363d] hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0 text-xs font-mono text-gray-400">
            {currentItem && (
              <>
                <span className="truncate hidden md:inline text-gray-400">
                  {currentItem.repository}
                </span>
                <span className="hidden md:inline">·</span>
                <span className="font-bold text-gray-200">
                  PR #{currentItem.number}
                </span>
                <span className="hidden lg:inline text-neutral-400 truncate max-w-md">
                  : {currentItem.title}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Prev / Next Report Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!prevReport}
            onClick={() => {
              if (prevReport?.report?.id) {
                onSelectReport(
                  prevReport.report.id,
                  `${prevReport.repository}#${prevReport.number}: ${prevReport.title}`
                );
              }
            }}
            className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-400 hover:text-white border border-[#30363d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={prevReport ? t('reportDetail.prevReportTooltip', { number: prevReport.number }) : t('reportDetail.noPrevReportTooltip')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-neutral-400 px-1">
            {currentReportIndex >= 0 ? currentReportIndex + 1 : 0} / {reportItems.length}
          </span>
          <button
            type="button"
            disabled={!nextReport}
            onClick={() => {
              if (nextReport?.report?.id) {
                onSelectReport(
                  nextReport.report.id,
                  `${nextReport.repository}#${nextReport.number}: ${nextReport.title}`
                );
              }
            }}
            className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-400 hover:text-white border border-[#30363d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={nextReport ? t('reportDetail.nextReportTooltip', { number: nextReport.number }) : t('reportDetail.noNextReportTooltip')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Review Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ReviewReportView reportId={reportId} />
      </div>
    </div>
  );
}
