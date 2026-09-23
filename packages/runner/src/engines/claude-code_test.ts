import { assertEquals } from 'jsr:@std/assert';
import { ClaudeCodeEngine } from './claude-code.ts';

Deno.test('ClaudeCodeEngine - initializes with connection and turn options', () => {
  const engine = new ClaudeCodeEngine({
    model: 'ornith-1.5:9b',
    apiBaseUrl: 'http://localhost:4000',
    authToken: 'sk-test-token',
    customEnv: {
      TEST_ENV_VAR: 'value1',
    },
    maxTurns: 15,
  });

  assertEquals(engine.name, 'claude-code');
});
