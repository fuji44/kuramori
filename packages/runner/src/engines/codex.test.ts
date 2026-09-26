import { assertEquals, assertStringIncludes } from '@std/assert';
import { join } from '@std/path';
import { CodexEngine } from './codex.ts';

Deno.test('CodexEngine - runs exec with structured output, profile options, and profile environment', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'kuramori-codex-test-' });
  const worktreePath = join(tempDir, 'worktree');
  const outputDir = join(tempDir, 'output');
  const argsPath = join(tempDir, 'args.txt');
  const promptPath = join(tempDir, 'prompt.txt');
  const environmentPath = join(tempDir, 'environment.txt');
  const codexPath = join(tempDir, 'codex');
  const binDir = join(tempDir, 'bin');
  const previousPath = Deno.env.get('PATH') ?? '';
  const finalMessage = JSON.stringify({
    verdict: 'APPROVE',
    summary: { brief: 'No findings', changedCode: 'No meaningful change', reachPaths: [] },
    comments: [],
  });

  try {
    await Deno.mkdir(worktreePath, { recursive: true });
    await Deno.mkdir(binDir, { recursive: true });
    const ghPath = join(binDir, 'gh');
    await Deno.writeTextFile(ghPath, `#!/bin/sh
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '%s' '{"number":1,"title":"Test PR","body":"","author":{"login":"tester"},"url":"https://example.test/pr/1","headRefName":"feature","baseRefName":"main","headRefOid":"abc123"}'
elif [ "$1" = "api" ]; then
  printf '%s' '[]'
fi
`);
    await Deno.chmod(ghPath, 0o755);
    Deno.env.set('PATH', `${binDir}${Deno.build.os === 'windows' ? ';' : ':'}${previousPath}`);
    await Deno.writeTextFile(
      codexPath,
      `#!/bin/sh
printf '%s\\n' "$@" > '${argsPath}'
cat > '${promptPath}'
printf '%s' "$CODEX_TEST_ENV" > '${environmentPath}'
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output-last-message" ]; then
    printf '%s' '${finalMessage}' > "$2"
    shift 2
  else
    shift
  fi
done
printf '%s\\n' '{"type":"thread.started"}' '{"type":"turn.completed"}'
`,
    );
    await Deno.chmod(codexPath, 0o755);

    const engine = new CodexEngine({
      codexBinaryPath: codexPath,
      model: 'gpt-6-luna',
      effort: 'high',
      sandboxMode: 'workspace-write',
      customEnv: { CODEX_TEST_ENV: { value: 'profile-value', secret: false } },
    });
    const result = await engine.execute({
      jobId: 'job-codex-test',
      requestId: 'repo#1',
      repository: 'owner/repo',
      number: 1,
      headSha: 'abc123',
      worktreePath,
      outputDir,
      logPath: join(tempDir, 'codex.log'),
    });

    assertEquals(result.success, true, result.error);
    assertEquals(result.reportData?.verdict, 'APPROVE');
    const args = await Deno.readTextFile(argsPath);
    assertStringIncludes(args, 'exec');
    assertStringIncludes(args, '--json');
    assertStringIncludes(args, '--sandbox\nworkspace-write');
    assertStringIncludes(args, '--model\ngpt-6-luna');
    assertStringIncludes(args, 'model_reasoning_effort="high"');
    assertStringIncludes(args, 'approval_policy="never"');
    assertEquals(await Deno.readTextFile(environmentPath), 'profile-value');
    assertStringIncludes(await Deno.readTextFile(promptPath), 'owner/repo#1');
  } finally {
    Deno.env.set('PATH', previousPath);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('CodexEngine - rejects custom arguments that disable the sandbox', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'kuramori-codex-danger-test-' });

  try {
    const engine = new CodexEngine({ customArgs: '--yolo' });
    const result = await engine.execute({
      jobId: 'job-codex-danger-test',
      requestId: 'repo#1',
      repository: 'owner/repo',
      number: 1,
      headSha: 'abc123',
      worktreePath: tempDir,
      outputDir: join(tempDir, 'output'),
      logPath: join(tempDir, 'codex.log'),
    });

    assertEquals(result.success, false);
    assertStringIncludes(result.error ?? '', 'cannot bypass approvals and sandboxing');
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
