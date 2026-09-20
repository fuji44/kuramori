import { join } from 'node:path';
import type { ReportStorage } from '../interfaces/report-storage.ts';

export class LocalFileReportStorage implements ReportStorage {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
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
        return null;
      }
      throw err;
    }
  }

  async exists(reportId: string): Promise<boolean> {
    const filePath = join(this.baseDir, `${reportId}.html`);
    try {
      const stat = await Deno.stat(filePath);
      return stat.isFile;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return false;
      }
      throw err;
    }
  }
}
