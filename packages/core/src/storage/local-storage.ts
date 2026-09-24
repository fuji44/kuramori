import { join, resolve } from 'node:path';
import type { ReportStorage } from '../interfaces/report-storage.ts';
import type { ReviewReportData } from '../schema/review-report.ts';

export class LocalFileReportStorage implements ReportStorage {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = resolve(baseDir);
  }

  async saveReport(reportId: string, htmlContent: string): Promise<string> {
    await Deno.mkdir(this.baseDir, { recursive: true });
    const filePath = join(this.baseDir, `${reportId}.html`);
    await Deno.writeTextFile(filePath, htmlContent);
    return filePath;
  }

  async getReportHtml(reportId: string): Promise<string | null> {
    const filePath = join(this.baseDir, `${reportId}.html`);
    try {
      return await Deno.readTextFile(filePath);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        // HTML がまだない場合は JSON データからオンデマンド生成
        const data = await this.getReportData(reportId);
        if (data) {
          const { generateStandaloneReviewHtml } = await import('../report/html-generator.ts');
          let inferredRepo = data.pr?.repo;
          let inferredPrNumber = data.pr?.number;
          if (!inferredRepo || !inferredPrNumber) {
            const match = reportId.match(/^([a-zA-Z0-9-]+)__([a-zA-Z0-9-]+)_(\d+)_/);
            if (match) {
              inferredRepo = inferredRepo ?? `${match[1]}/${match[2]}`;
              inferredPrNumber = inferredPrNumber ?? parseInt(match[3], 10);
            }
          }
          const html = generateStandaloneReviewHtml(data, {
            repo: inferredRepo,
            prNumber: inferredPrNumber,
            title: data.pr?.title,
          });
          // 次回のためにキャッシュ保存
          try {
            await Deno.writeTextFile(filePath, html);
          } catch {}
          return html;
        }
        return null;
      }
      throw err;
    }
  }

  async saveReportData(reportId: string, data: ReviewReportData): Promise<string> {
    await Deno.mkdir(this.baseDir, { recursive: true });
    const filePath = join(this.baseDir, `${reportId}.json`);
    await Deno.writeTextFile(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  async getReportData(reportId: string): Promise<ReviewReportData | null> {
    const filePath = join(this.baseDir, `${reportId}.json`);
    try {
      const content = await Deno.readTextFile(filePath);
      return JSON.parse(content) as ReviewReportData;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return null;
      }
      throw err;
    }
  }

  async exists(reportId: string): Promise<boolean> {
    const jsonPath = join(this.baseDir, `${reportId}.json`);
    const htmlPath = join(this.baseDir, `${reportId}.html`);
    try {
      const stat = await Deno.stat(jsonPath);
      if (stat.isFile) return true;
    } catch {
      // check html
    }
    try {
      const stat = await Deno.stat(htmlPath);
      return stat.isFile;
    } catch {
      return false;
    }
  }
}
