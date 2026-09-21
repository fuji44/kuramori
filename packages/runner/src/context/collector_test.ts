import { assertEquals } from "jsr:@std/assert";
import { extractIssueReferences } from "./collector.ts";

Deno.test("extractIssueReferences - extracts full GitHub issue URLs", () => {
  const body = `
Closes https://github.com/luupsc/luup-stories/issues/9405.
Also see https://github.com/luupsc/luup-server/issues/12345 for details.
  `;
  const refs = extractIssueReferences(body, "luupsc/luup-server");
  assertEquals(refs.length, 2);
  assertEquals(refs[0].owner, "luupsc");
  assertEquals(refs[0].repo, "luup-stories");
  assertEquals(refs[0].number, 9405);
  assertEquals(refs[1].owner, "luupsc");
  assertEquals(refs[1].repo, "luup-server");
  assertEquals(refs[1].number, 12345);
});

Deno.test("extractIssueReferences - extracts cross-repo references", () => {
  const body = `
Fixes luupsc/luup-stories#9999.
  `;
  const refs = extractIssueReferences(body, "luupsc/luup-server");
  assertEquals(refs.length, 1);
  assertEquals(refs[0].owner, "luupsc");
  assertEquals(refs[0].repo, "luup-stories");
  assertEquals(refs[0].number, 9999);
  assertEquals(refs[0].url, "https://github.com/luupsc/luup-stories/issues/9999");
});

Deno.test("extractIssueReferences - extracts short #123 references using defaultRepo", () => {
  const body = `
Resolves #4321 in this repository.
  `;
  const refs = extractIssueReferences(body, "my-org/my-repo");
  assertEquals(refs.length, 1);
  assertEquals(refs[0].owner, "my-org");
  assertEquals(refs[0].repo, "my-repo");
  assertEquals(refs[0].number, 4321);
});

Deno.test("extractIssueReferences - deduplicates repeated references", () => {
  const body = `
Related to #100.
Mentioning #100 again.
Also https://github.com/my-org/my-repo/issues/100
  `;
  const refs = extractIssueReferences(body, "my-org/my-repo");
  assertEquals(refs.length, 1);
  assertEquals(refs[0].number, 100);
});
