import { assertEquals } from '@std/assert';
import { getPrAnchorId } from './anchor.ts';

Deno.test('anchor - getPrAnchorId formats slugified anchor id', () => {
  assertEquals(getPrAnchorId('owner/repo', 123), 'pr-owner-repo-123');
  assertEquals(getPrAnchorId('luupsc/luup-server', 4567), 'pr-luupsc-luup-server-4567');
  assertEquals(getPrAnchorId('org/sub_repo.service', 89), 'pr-org-sub_repo-service-89');
});
