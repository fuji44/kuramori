import { assertEquals } from 'jsr:@std/assert';
import { extractChangedFilesFromDiff, buildReviewPrompt } from './runner-pipeline.ts';

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
