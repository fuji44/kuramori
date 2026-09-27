import { assertEquals, assertThrows } from '@std/assert';
import { assertNever } from './assert.ts';

Deno.test('assertNever - throws TypeError with serialized value', () => {
  assertThrows(
    () => {
      const invalid = 'UNKNOWN_KEY' as unknown as never;
      assertNever(invalid);
    },
    TypeError,
    'Unexpected value: "UNKNOWN_KEY"',
  );
});

Deno.test('assertNever - passes exhaustive switch compilation', () => {
  type Status = 'open' | 'closed';

  function formatStatus(status: Status): string {
    switch (status) {
      case 'open':
        return 'Open';
      case 'closed':
        return 'Closed';
      default:
        return assertNever(status);
    }
  }

  assertEquals(formatStatus('open'), 'Open');
  assertEquals(formatStatus('closed'), 'Closed');
});
