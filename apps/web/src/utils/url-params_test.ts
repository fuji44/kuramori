import { assertEquals } from 'jsr:@std/assert@^1.0.11';
import { buildUrlSearch, parseUrlParams } from './url-params.ts';

Deno.test('url-params - parseUrlParams parses query string accurately', () => {
  const parsed = parseUrlParams('?q=is:open+author:alice&status=unreviewed&repo=luupsc/luup-server&report=rep-123');
  assertEquals(parsed.q, 'is:open author:alice');
  assertEquals(parsed.status, 'unreviewed');
  assertEquals(parsed.repo, 'luupsc/luup-server');
  assertEquals(parsed.report, 'rep-123');

  const empty = parseUrlParams('');
  assertEquals(empty.q, undefined);
  assertEquals(empty.status, undefined);
  assertEquals(empty.repo, undefined);
  assertEquals(empty.report, undefined);

  // Invalid status fallback
  const invalidStatus = parseUrlParams('?status=invalid');
  assertEquals(invalidStatus.status, undefined);
});

Deno.test('url-params - buildUrlSearch serializes parameters', () => {
  const search1 = buildUrlSearch({
    q: 'is:open author:alice',
    status: 'unreviewed',
    repo: 'luupsc/luup-server',
    report: 'rep-123',
  });
  assertEquals(search1, '?q=is%3Aopen+author%3Aalice&status=unreviewed&repo=luupsc%2Fluup-server&report=rep-123');

  // Skips default/empty values
  const search2 = buildUrlSearch({
    q: '',
    status: 'all',
    repo: 'all',
    report: '',
  });
  assertEquals(search2, '');
});

Deno.test('url-params - round trip consistency', () => {
  const original = {
    q: 'review:approved head:feature',
    status: 'completed' as const,
    repo: 'owner/repo',
    report: 'rep-456',
  };

  const serialized = buildUrlSearch(original);
  const roundTrip = parseUrlParams(serialized);

  assertEquals(roundTrip.q, original.q);
  assertEquals(roundTrip.status, original.status);
  assertEquals(roundTrip.repo, original.repo);
  assertEquals(roundTrip.report, original.report);
});
