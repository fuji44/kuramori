import { assertEquals } from "@std/assert";
import {
  resolveEngineConfig,
  resolveRuleEngineProfile,
  type AntigravityEngineConfig,
  type ClaudeCodeEngineConfig,
  type EngineOverrideConfig,
  type EngineProfile,
} from './review.ts';

Deno.test('resolveEngineConfig - merges overrides comprehensively', () => {
  const baseConfig: AntigravityEngineConfig = {
    binPath: 'agy',
    model: 'gemini-3.1-pro',
    effort: 'high',
    timeoutSeconds: 900,
    systemPrompt: 'Default senior engineer persona',
    printTimeout: '600s',
    sandbox: false,
    disableSlashCommands: false,
    inputFormat: 'text',
    outputFormat: 'text',
    jsonSchema: '',
    customArgs: '',
  };

  const override: EngineOverrideConfig = {
    model: 'gemini-3.8-flash',
    effort: 'low',
    timeoutSeconds: 300,
    systemPrompt: 'Specialized security auditor persona',
  };

  const resolved = resolveEngineConfig(baseConfig, override);

  // Overridden properties
  assertEquals(resolved.model, 'gemini-3.8-flash');
  assertEquals(resolved.effort, 'low');
  assertEquals(resolved.timeoutSeconds, 300);
  assertEquals(resolved.systemPrompt, 'Specialized security auditor persona');

  // Retained base properties
  assertEquals(resolved.binPath, 'agy');
  assertEquals(resolved.printTimeout, '600s');
  assertEquals(resolved.sandbox, false);
  assertEquals(resolved.inputFormat, 'text');
});

Deno.test('resolveEngineConfig - ignores undefined, null, or empty string overrides', () => {
  const baseConfig: ClaudeCodeEngineConfig = {
    binPath: 'claude',
    model: 'sonnet',
    effort: 'high',
    timeoutSeconds: 900,
    systemPrompt: 'Base persona',
    allowedTools: 'Read,Grep',
    bare: false,
    inputFormat: 'text',
    outputFormat: 'text',
    jsonSchema: '',
    customArgs: '--mode plan',
  };

  const override: EngineOverrideConfig = {
    model: '', // Empty string should be ignored
    effort: undefined, // Undefined should be ignored
    systemPrompt: 'Overridden persona',
  };

  const resolved = resolveEngineConfig(baseConfig, override);

  assertEquals(resolved.model, 'sonnet');
  assertEquals(resolved.effort, 'high');
  assertEquals(resolved.systemPrompt, 'Overridden persona');
  assertEquals(resolved.customArgs, '--mode plan');
});

Deno.test('resolveEngineConfig - returns clone of baseConfig when override is undefined or null', () => {
  const baseConfig: AntigravityEngineConfig = {
    binPath: 'agy',
    model: 'gemini-3.1-pro',
    effort: 'high',
    timeoutSeconds: 900,
    printTimeout: '',
    sandbox: false,
    disableSlashCommands: false,
  };

  const resolvedUndefined = resolveEngineConfig(baseConfig, undefined);
  assertEquals(resolvedUndefined, baseConfig);

  const resolvedNull = resolveEngineConfig(baseConfig, null);
  assertEquals(resolvedNull, baseConfig);
});

Deno.test('EngineProfile - discriminated union guarantees type-safe config access', () => {
  const claudeProfile = {
    id: 'prof-ollama-ornith',
    name: 'Claude Code Profile',
    engineType: 'claude-code' as const,
    config: {
      binPath: 'claude',
      model: 'ornith-1.5:9b',
      effort: 'high',
      timeoutSeconds: 900,
      customEnv: {
        ANTHROPIC_BASE_URL: { value: 'http://localhost:11434', secret: false },
      },
      maxTurns: 15,
      bare: false,
    },
  };

  const agyProfile = {
    id: 'prof-agy',
    name: 'Antigravity Default',
    engineType: 'antigravity' as const,
    config: {
      binPath: 'agy',
      model: 'gemini-3.1-pro',
      effort: 'high',
      timeoutSeconds: 900,
      printTimeout: '',
      sandbox: false,
      disableSlashCommands: false,
    },
  };

  const mockProfile = {
    id: 'prof-mock',
    name: 'Mock Engine',
    engineType: 'mock' as const,
    config: {
      delayMs: 300,
    },
  };

  function getProfileSummary(profile: typeof claudeProfile | typeof agyProfile | typeof mockProfile): string {
    switch (profile.engineType) {
      case 'claude-code':
        return `${profile.config.model} with ${Object.keys(profile.config.customEnv ?? {}).length} custom environment variables`;
      case 'antigravity':
        return `${profile.config.model} (${profile.config.effort})`;
      case 'mock':
        return `Mock delay: ${profile.config.delayMs}ms`;
    }
  }

  assertEquals(getProfileSummary(claudeProfile), 'ornith-1.5:9b with 1 custom environment variables');
  assertEquals(getProfileSummary(agyProfile), 'gemini-3.1-pro (high)');
  assertEquals(getProfileSummary(mockProfile), 'Mock delay: 300ms');
});

Deno.test('resolveRuleEngineProfile - resolves by profile ID, engineType, and returns undefined for unknown profiles', () => {
  const profiles: EngineProfile[] = [
    {
      id: 'default-agy',
      name: 'Antigravity (Default)',
      isDefault: true,
      engineType: 'antigravity',
      config: {
        binPath: 'agy',
        model: 'gemini-pro',
        effort: 'high',
        timeoutSeconds: 900,
        printTimeout: '600s',
        sandbox: false,
        disableSlashCommands: false,
      },
    },
    {
      id: 'default-claude',
      name: 'Claude Code (Default)',
      isDefault: false,
      engineType: 'claude-code',
      config: {
        binPath: 'claude',
        model: 'sonnet',
        effort: 'high',
        timeoutSeconds: 900,
        bare: false,
      },
    },
  ];

  // 1. Exact profile ID match
  assertEquals(resolveRuleEngineProfile('default-claude', profiles)?.id, 'default-claude');

  // 2. EngineType match (fallback for raw engine names like 'claude-code')
  assertEquals(resolveRuleEngineProfile('claude-code', profiles)?.id, 'default-claude');

  // 3. 'default' or undefined/null resolves to default profile
  assertEquals(resolveRuleEngineProfile('default', profiles)?.id, 'default-agy');
  assertEquals(resolveRuleEngineProfile(undefined, profiles)?.id, 'default-agy');

  // 4. Unknown profile ID returns undefined (no fallback)
  assertEquals(resolveRuleEngineProfile('non-existent-id', profiles), undefined);
});
