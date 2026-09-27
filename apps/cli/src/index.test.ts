import { assertEquals } from '@std/assert';
import type { Command } from '@cliffy/command';
import { createCliCommand, main } from './index.ts';

Deno.test('CLI - command tree has all required subcommands and aliases', () => {
  const cli = createCliCommand();
  const commands = cli.getCommands();
  const commandNames = commands.map((c: Command) => c.getName());

  assertEquals(commandNames.includes('run'), true);
  assertEquals(commandNames.includes('serve'), true);
  assertEquals(commandNames.includes('doctor'), true);
  assertEquals(commandNames.includes('paths'), true);
  assertEquals(commandNames.includes('completions'), true);
});

Deno.test('CLI - paths command outputs valid JSON format', async () => {
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  try {
    await main(['paths', '--json']);
    const output = logs.join('\n');
    const parsed = JSON.parse(output);
    assertEquals(typeof parsed.dataDir, 'string');
    assertEquals(typeof parsed.databaseFile, 'string');
    assertEquals(typeof parsed.cacheDir, 'string');
  } finally {
    console.log = originalLog;
  }
});

Deno.test('CLI - doctor command executes without throwing', async () => {
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  try {
    await main(['doctor']);
    assertEquals(logs.some((l) => l.includes('Diagnostic completed')), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test('CLI - completions command generates shell scripts', async () => {
  const cli = createCliCommand().throwErrors();
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  try {
    await cli.parse(['completions', 'bash']);
    assertEquals(logs.some((l) => l.includes('complete -F')), true);
  } finally {
    console.log = originalLog;
  }
});
