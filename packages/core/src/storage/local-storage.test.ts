import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { LocalFileReportStorage } from './local-storage.ts';

Deno.test('LocalFileReportStorage - save, retrieve and check existence', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'kuramori-storage-test-' });

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

    // Save and retrieve JSON report data
    const jsonReportId = 'test-report-json';
    const reportData = {
      verdict: 'APPROVE' as const,
      summary: {
        brief: 'テスト要約',
        changedCode: 'テストコード',
        reachPaths: [],
      },
      comments: [],
    };

    assertEquals(await storage.getReportData(jsonReportId), null);
    const savedJsonPath = await storage.saveReportData(jsonReportId, reportData);
    assertEquals(savedJsonPath, join(tempDir, `${jsonReportId}.json`));
    assertEquals(await storage.exists(jsonReportId), true);

    const retrievedData = await storage.getReportData(jsonReportId);
    assertEquals(retrievedData?.verdict, 'APPROVE');
    assertEquals(retrievedData?.summary.brief, 'テスト要約');
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
