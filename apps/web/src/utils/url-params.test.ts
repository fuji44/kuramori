import { assertEquals } from '@std/assert';
import { buildUrlSearch, parseUrlParams } from './url-params.ts';

Deno.test('url-params - parseUrlParams parses query string accurately', () => {
  const parsed = parseUrlParams('?q=is:open+author:alice&report=rep-123&own=true');
  assertEquals(parsed.q, 'is:open author:alice');
  assertEquals(parsed.report, 'rep-123');

  const empty = parseUrlParams('');
  assertEquals(empty.q, undefined);
  assertEquals(empty.report, undefined);
});

Deno.test('url-params - buildUrlSearch serializes parameters', () => {
  const search1 = buildUrlSearch({
    q: 'is:open author:alice',
    report: 'rep-123',
  });
  assertEquals(search1, '?q=is%3Aopen+author%3Aalice&report=rep-123');

  // Skips default/empty values
  const search2 = buildUrlSearch({
    q: '',
    report: '',
  });
  assertEquals(search2, '');
});

Deno.test('url-params - round trip consistency', () => {
  const original = {
    q: 'review:approved head:feature',
    report: 'rep-456',
  };

  const serialized = buildUrlSearch(original);
  const roundTrip = parseUrlParams(serialized);

  assertEquals(roundTrip.q, original.q);
  assertEquals(roundTrip.report, original.report);
});
