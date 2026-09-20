export interface ReportStorage {
  saveReport(reportId: string, htmlContent: string): Promise<string>;
  getReportHtml(reportId: string): Promise<string | null>;
  exists(reportId: string): Promise<boolean>;
}
