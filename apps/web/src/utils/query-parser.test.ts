import { assertEquals } from 'jsr:@std/assert@^1.0.11';
import { filterByGitHubQuery } from './query-parser.ts';

const testItems = [
  {
    id: '1',
    repository: 'luupsc/luup-server',
    number: 101,
    title: 'feat: add user authentication',
    author: 'alice',
    sourceBranch: 'feature/auth',
    targetBranch: 'main',
    headSha: '0eff326d6213c456',
    additions: 150,
    deletions: 20,
    isDraft: false,
    isOwn: false,
    state: 'open',
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-18T12:00:00Z',
    labels: [{ name: 'feature', color: 'blue' }, { name: 'backend', color: 'gray' }],
    milestone: 'v1.0',
    assignees: [{ login: 'charlie' }],
    requestedReviewers: [{ login: 'reviewer-user' }],
    latestJob: { status: 'completed' },
    report: { verdict: 'APPROVE' },
  },
  {
    id: '2',
    repository: 'luupsc/luup-server',
    number: 102,
    title: 'fix: billing bug in checkout',
    author: 'bob',
    sourceBranch: 'fix/billing',
    targetBranch: 'main',
    headSha: 'e1109ab789123456',
    additions: 30,
    deletions: 5,
    isDraft: true,
    isOwn: true,
    state: 'open',
    createdAt: '2026-09-12T08:00:00Z',
    updatedAt: '2026-09-15T09:00:00Z',
    labels: [{ name: 'bug', color: 'red' }],
    milestone: null,
    assignees: [],
    requestedReviewers: [],
    latestJob: { status: 'pending' },
    report: null,
  },
  {
    id: '3',
    repository: 'other/web',
    number: 205,
    title: 'refactor: database client connection',
    author: 'alice',
    sourceBranch: 'refactor/db',
    targetBranch: 'develop',
    headSha: 'a4b5c6d7e8f90123',
    additions: 500,
    deletions: 400,
    isDraft: false,
    isOwn: false,
    state: 'merged',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-05T10:00:00Z',
    labels: [],
    milestone: 'v2.0-beta',
    assignees: [{ login: 'alice' }],
    requestedReviewers: [{ login: 'team-leads', isTeam: true }],
    latestJob: { status: 'completed' },
    report: { verdict: 'REQUEST_CHANGES' },
  },
];

Deno.test('filterByGitHubQuery - author and repo filters', () => {
  assertEquals(filterByGitHubQuery(testItems, 'author:alice').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'author:bob').length, 1);
  assertEquals(filterByGitHubQuery(testItems, '-author:alice').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'repo:luup-server').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'repo:other/web').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'user:luupsc').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'org:other').length, 1);
});

Deno.test('filterByGitHubQuery - draft and state filters', () => {
  assertEquals(filterByGitHubQuery(testItems, 'is:draft').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'draft:true').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'draft:false').length, 2);
  assertEquals(filterByGitHubQuery(testItems, '-is:draft').length, 2);

  assertEquals(filterByGitHubQuery(testItems, 'is:open').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'is:closed').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'is:merged').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'is:unmerged').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'state:open').length, 2);
});

Deno.test('filterByGitHubQuery - branches and commit SHA', () => {
  assertEquals(filterByGitHubQuery(testItems, 'head:auth').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'base:main').length, 2);
  assertEquals(filterByGitHubQuery(testItems, '-base:main').length, 1);

  // SHA qualifier
  assertEquals(filterByGitHubQuery(testItems, 'sha:0eff326').length, 1);
  // Direct hex SHA query
  assertEquals(filterByGitHubQuery(testItems, 'e1109ab').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'a4b5c6d7e8f9').length, 1);
});

Deno.test('filterByGitHubQuery - review qualifiers', () => {
  assertEquals(filterByGitHubQuery(testItems, 'is:reviewed').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'is:unreviewed').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'review:approved').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'review:changes_requested').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'review:none').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'status:pending').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'status:completed').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'verdict:APPROVE').length, 1);
});

Deno.test('filterByGitHubQuery - dates and ranges', () => {
  assertEquals(filterByGitHubQuery(testItems, 'created:2026-09-18').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'created:>2026-09-10').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'created:<2026-09-10').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'created:2026-09-10..2026-09-18').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'created:2026-09-15..*').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'created:*..2026-09-15').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'updated:>2026-09-16').length, 1);
});

Deno.test('filterByGitHubQuery - in:title and compound queries', () => {
  // Free text
  assertEquals(filterByGitHubQuery(testItems, 'billing').length, 1);
  assertEquals(filterByGitHubQuery(testItems, '101').length, 1);

  // in:title matches title only (ignoring repo or branch)
  assertEquals(filterByGitHubQuery(testItems, 'in:title connection').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'in:title luup').length, 0);

  // Compound queries
  assertEquals(filterByGitHubQuery(testItems, 'is:open is:pr -is:draft author:alice').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'type:pr is:merged review:changes_requested').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'type:issue').length, 0);
});

Deno.test('filterByGitHubQuery - review-requested and reviewer qualifiers', () => {
  assertEquals(filterByGitHubQuery(testItems, 'review-requested:reviewer-user').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'user-review-requested:@me').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'team-review-requested:team-leads').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'reviewed-by:alice').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'review-involves:reviewer-user').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'is:approved').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'is:changes-requested').length, 1);
});

Deno.test('filterByGitHubQuery - assignee qualifiers', () => {
  assertEquals(filterByGitHubQuery(testItems, 'assignee:charlie').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'assignee:alice').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'assignee:*').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'no:assignee').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'has:assignee').length, 2);
});

Deno.test('filterByGitHubQuery - label qualifiers', () => {
  assertEquals(filterByGitHubQuery(testItems, 'label:feature').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'label:bug').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'label:feature,bug').length, 2);
  assertEquals(filterByGitHubQuery(testItems, '-label:bug').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'no:label').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'has:label').length, 2);
});

Deno.test('filterByGitHubQuery - milestone qualifiers', () => {
  assertEquals(filterByGitHubQuery(testItems, 'milestone:v1.0').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'milestone:*').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'no:milestone').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'has:milestone').length, 2);
});

Deno.test('filterByGitHubQuery - additions, deletions and lines', () => {
  assertEquals(filterByGitHubQuery(testItems, 'additions:>100').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'additions:<50').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'additions:100..200').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'deletions:>100').length, 1);
  assertEquals(filterByGitHubQuery(testItems, 'lines:>150').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'size:<50').length, 1);
});

Deno.test('filterByGitHubQuery - author:@me and involves', () => {
  assertEquals(filterByGitHubQuery(testItems, 'author:@me').length, 1);
  assertEquals(filterByGitHubQuery(testItems, '-author:@me').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'involves:alice').length, 2);
  assertEquals(filterByGitHubQuery(testItems, 'involves:charlie').length, 1);
});
