import { assertEquals } from 'jsr:@std/assert';
import { ClaudeCodeEngine } from './claude-code.ts';

Deno.test('ClaudeCodeEngine - initializes with connection and turn options', () => {
  const engine = new ClaudeCodeEngine({
    model: 'ornith-1.5:9b',
    customEnv: {
      TEST_ENV_VAR: 'value1',
      ANTHROPIC_BASE_URL: { value: 'http://localhost:4000', secret: false },
      ANTHROPIC_AUTH_TOKEN: { value: 'test-token', secret: true },
    },
    maxTurns: 15,
  });

  assertEquals(engine.name, 'claude-code');
});
