import { assertEquals } from 'jsr:@std/assert@^1.0.11';
import { join } from 'node:path';
import { LocalFileReportStorage } from './local-storage.ts';

Deno.test('LocalFileReportStorage - save, retrieve and check existence', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'review-base-storage-test-' });

  try {
    const storage = new LocalFileReportStorage(tempDir);
    const reportId = 'test-report-1';
    const html = '<html><body><h1>Review Report</h1></body></html>';

    // Verify initially does not exist
    assertEquals(await storage.exists(reportId), false);
    assertEquals(await storage.getReportHtml(reportId), null);

    // Save report
    const savedPath = await storage.saveReport(reportId, html);
    assertEquals(savedPath, join(tempDir, `${reportId}.html`));

    // Verify exists and content matches
    assertEquals(await storage.exists(reportId), true);
    assertEquals(await storage.getReportHtml(reportId), html);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
