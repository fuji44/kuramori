import { assertEquals, assertThrows } from '@std/assert';
import { assertNever } from './assert.ts';

Deno.test('assertNever - throws TypeError with serialized value', () => {
  assertThrows(
    () => {
      // 実行時に不正な値が渡された場合のフォールバック検証
      const invalid = 'UNKNOWN_VERDICT' as unknown as never;
      assertNever(invalid);
    },
    TypeError,
    'Unexpected value: "UNKNOWN_VERDICT"',
  );
});

Deno.test('assertNever - throws TypeError with custom message if provided', () => {
  assertThrows(
    () => {
      const invalid = 123 as unknown as never;
      assertNever(invalid, 'Custom exhaustiveness failure');
    },
    TypeError,
    'Custom exhaustiveness failure',
  );
});

Deno.test('assertNever - passes exhaustive switch compilation', () => {
  type Action = 'start' | 'stop';

  function handleAction(action: Action): string {
    switch (action) {
      case 'start':
        return 'started';
      case 'stop':
        return 'stopped';
      default:
        return assertNever(action);
    }
  }

  assertEquals(handleAction('start'), 'started');
  assertEquals(handleAction('stop'), 'stopped');
});
