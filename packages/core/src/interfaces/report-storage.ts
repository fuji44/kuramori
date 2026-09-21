import type { ReviewReportData } from '../schema/review-report.ts';

export interface ReportStorage {
  saveReport(reportId: string, htmlContent: string): Promise<string>;
  getReportHtml(reportId: string): Promise<string | null>;
  saveReportData(reportId: string, data: ReviewReportData): Promise<string>;
  getReportData(reportId: string): Promise<ReviewReportData | null>;
  exists(reportId: string): Promise<boolean>;
}

