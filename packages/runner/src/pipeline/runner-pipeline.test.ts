import { assertEquals } from '@std/assert';
import { extractChangedFilesFromDiff, buildReviewPrompt, executePostFlight } from './runner-pipeline.ts';

Deno.test('extractChangedFilesFromDiff - correctly extracts modified file paths', () => {
  const diff = `
diff --git a/packages/core/src/index.ts b/packages/core/src/index.ts
index 1234..5678 100644
--- a/packages/core/src/index.ts
+++ b/packages/core/src/index.ts
@@ -1,3 +1,4 @@
+export * from './schema.ts';
diff --git a/packages/runner/src/cli.ts b/packages/runner/src/cli.ts
index abcd..ef01 100644
--- a/packages/runner/src/cli.ts
+++ b/packages/runner/src/cli.ts
@@ -10,3 +10,4 @@
   `;

  const files = extractChangedFilesFromDiff(diff);
  assertEquals(files.size, 2);
  assertEquals(files.has('packages/core/src/index.ts'), true);
  assertEquals(files.has('packages/runner/src/cli.ts'), true);
});

Deno.test('buildReviewPrompt - includes JSON schema and repository details', async () => {
  const prompt = await buildReviewPrompt({
    jobId: 'job-1',
    requestId: 'org/repo#123',
    repository: 'org/repo',
    number: 123,
    headSha: 'abc',
    worktreePath: '/tmp/worktree',
    outputDir: '/tmp/output',
    logPath: '/tmp/log.txt',
  });

  assertEquals(prompt.includes('org/repo#123'), true);
  assertEquals(prompt.includes('ZOD 4 SCHEMA'), true);
  assertEquals(prompt.includes('"verdict"'), true);
  assertEquals(prompt.includes('"summary"'), true);
  assertEquals(prompt.includes('"comments"'), true);
});

Deno.test('executePostFlight - extracts structured JSON directly from stdout and validates', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'review-pipeline-test-' });
  const logPath = `${tempDir}/log.txt`;

  try {
    const validJsonOutput = JSON.stringify({
      verdict: 'APPROVE',
      summary: {
        brief: '問題なし',
        changedCode: '安全なリファクタリング',
      },
      comments: [],
    });

    const stdout = `I have finished reviewing the PR.\n\`\`\`json\n${validJsonOutput}\n\`\`\`\nDone.`;

    const result = await executePostFlight(
      {
        jobId: 'job-test',
        requestId: 'test/repo#1',
        repository: 'test/repo',
        number: 1,
        headSha: 'sha123',
        worktreePath: tempDir,
        outputDir: tempDir,
        logPath,
      },
      async () => {},
      stdout
    );

    assertEquals(result.success, true);
    assertEquals(result.verdict, 'APPROVE');
    assertEquals(result.ruleResult?.verdict, 'PASS');
    assertEquals(result.ruleResult?.summary, '問題なし');
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
