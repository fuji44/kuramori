import { assertEquals, assert } from '@std/assert';
import { getSearchSuggestions, ALL_BASE_SUGGESTIONS } from './search-suggestions.ts';

Deno.test('getSearchSuggestions - returns all base suggestions when token is empty', () => {
  const suggestions = getSearchSuggestions('', {
    authors: ['alice', 'bob'],
    repositories: ['org/repo1', 'org/repo2'],
  });

  assertEquals(suggestions.length, ALL_BASE_SUGGESTIONS.length);
  assert(suggestions.some((s) => s.value === 'is:open'));
  assert(suggestions.some((s) => s.value === 'team-review-requested:'));
  assert(suggestions.some((s) => s.value === 'review-requested:@me'));
  assert(suggestions.some((s) => s.value === 'milestone:*'));
  assert(suggestions.some((s) => s.value === 'no:assignee'));
  assert(suggestions.some((s) => s.value === 'has:label'));
  assert(suggestions.some((s) => s.value === 'status:pending'));
  assert(suggestions.some((s) => s.value === 'verdict:APPROVE'));
});

Deno.test('getSearchSuggestions - suggests team-review-requested when typing "team"', () => {
  const suggestions = getSearchSuggestions('team', {
    authors: ['alice'],
    repositories: ['org/repo'],
  });

  assert(suggestions.length > 0);
  assert(suggestions.some((s) => s.value === 'team-review-requested:'));
});

Deno.test('getSearchSuggestions - suggests milestone queries when typing "mile"', () => {
  const suggestions = getSearchSuggestions('mile', {
    authors: ['alice'],
    repositories: ['org/repo'],
  });

  assert(suggestions.length >= 3);
  assert(suggestions.some((s) => s.value === 'milestone:*'));
  assert(suggestions.some((s) => s.value === 'no:milestone'));
  assert(suggestions.some((s) => s.value === 'has:milestone'));
});

Deno.test('getSearchSuggestions - author: provides @me and registered authors', () => {
  const suggestions = getSearchSuggestions('author:', {
    authors: ['alice', 'bob'],
    repositories: ['org/repo'],
  });

  assertEquals(suggestions.length, 3);
  assertEquals(suggestions[0]?.value, 'author:@me');
  assertEquals(suggestions[1]?.value, 'author:alice');
  assertEquals(suggestions[2]?.value, 'author:bob');
});

Deno.test('getSearchSuggestions - repo: provides registered repositories', () => {
  const suggestions = getSearchSuggestions('repo:', {
    authors: ['alice'],
    repositories: ['org/frontend', 'org/backend'],
  });

  assertEquals(suggestions.length, 2);
  assertEquals(suggestions[0]?.value, 'repo:org/frontend');
  assertEquals(suggestions[1]?.value, 'repo:org/backend');
});

Deno.test('getSearchSuggestions - review-requested: provides @me and authors', () => {
  const suggestions = getSearchSuggestions('review-requested:', {
    authors: ['alice', 'bob'],
    repositories: ['org/repo'],
  });

  assert(suggestions.some((s) => s.value === 'review-requested:@me'));
  assert(suggestions.some((s) => s.value === 'review-requested:alice'));
  assert(suggestions.some((s) => s.value === 'review-requested:bob'));
});

Deno.test('getSearchSuggestions - no: provides no-qualifier options', () => {
  const suggestions = getSearchSuggestions('no:', {
    authors: [],
    repositories: [],
  });

  assert(suggestions.some((s) => s.value === 'no:assignee'));
  assert(suggestions.some((s) => s.value === 'no:label'));
  assert(suggestions.some((s) => s.value === 'no:milestone'));
  assert(suggestions.some((s) => s.value === 'no:project'));
});

Deno.test('getSearchSuggestions - has: provides has-qualifier options', () => {
  const suggestions = getSearchSuggestions('has:', {
    authors: [],
    repositories: [],
  });

  assert(suggestions.some((s) => s.value === 'has:assignee'));
  assert(suggestions.some((s) => s.value === 'has:label'));
  assert(suggestions.some((s) => s.value === 'has:milestone'));
});

Deno.test('getSearchSuggestions - partial keyword matching works for all qualifiers', () => {
  const testKeywords = [
    'is',
    'state',
    'draft',
    'review',
    'assignee',
    'label',
    'additions',
    'deletions',
    'lines',
    'size',
    'head',
    'base',
    'sha',
    'created',
    'updated',
    'status',
    'verdict',
  ];

  for (const keyword of testKeywords) {
    const suggestions = getSearchSuggestions(keyword, {
      authors: ['alice'],
      repositories: ['org/repo'],
    });
    assert(suggestions.length > 0, `Keyword "${keyword}" should return at least one suggestion`);
  }
});
