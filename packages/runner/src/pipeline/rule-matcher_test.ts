import { assertEquals } from 'jsr:@std/assert@^1.0.11';
import type { ReviewRule } from '@review-base/core';
import { matchRuleTrigger, filterMatchingRules, type PrEvaluationEvent } from './rule-matcher.ts';

const baseRule: ReviewRule = {
  id: 'rule-test',
  name: 'Test Rule',
  description: 'Test rule description',
  category: 'security',
  engine: 'default',
  instructions: 'Find security bugs',
  trigger: {},
  enabled: true,
  createdAt: '2026-09-23T00:00:00Z',
  updatedAt: '2026-09-23T00:00:00Z',
};

Deno.test('RuleMatcher - matches based on eventType', () => {
  const rule: ReviewRule = {
    ...baseRule,
    trigger: { types: ['opened', 'synchronize'] },
  };

  const eventOpened: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['src/index.ts'],
    isDraft: false,
  };
  assertEquals(matchRuleTrigger(rule, eventOpened), true);

  const eventReopened: PrEvaluationEvent = {
    eventType: 'reopened',
    changedFiles: ['src/index.ts'],
    isDraft: false,
  };
  assertEquals(matchRuleTrigger(rule, eventReopened), false);
});

Deno.test('RuleMatcher - respects draft filter', () => {
  const rule: ReviewRule = {
    ...baseRule,
    trigger: { draft: false },
  };

  const draftEvent: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['src/index.ts'],
    isDraft: true,
  };
  assertEquals(matchRuleTrigger(rule, draftEvent), false);

  const nonDraftEvent: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['src/index.ts'],
    isDraft: false,
  };
  assertEquals(matchRuleTrigger(rule, nonDraftEvent), true);
});

Deno.test('RuleMatcher - matches path patterns', () => {
  const rule: ReviewRule = {
    ...baseRule,
    trigger: { paths: ['**/auth/**', '**/security/**'] },
  };

  const authEvent: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['apps/server/src/auth/login.ts', 'apps/server/src/main.ts'],
    isDraft: false,
  };
  assertEquals(matchRuleTrigger(rule, authEvent), true);

  const unrelatedEvent: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['apps/web/src/views/about.tsx'],
    isDraft: false,
  };
  assertEquals(matchRuleTrigger(rule, unrelatedEvent), false);
});

Deno.test('RuleMatcher - respects pathsIgnore patterns', () => {
  const rule: ReviewRule = {
    ...baseRule,
    trigger: { pathsIgnore: ['**/*.md', 'docs/**'] },
  };

  const docsOnlyEvent: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['README.md', 'docs/architecture.md'],
    isDraft: false,
  };
  assertEquals(matchRuleTrigger(rule, docsOnlyEvent), false);

  const mixedEvent: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['README.md', 'apps/server/src/main.ts'],
    isDraft: false,
  };
  assertEquals(matchRuleTrigger(rule, mixedEvent), true);
});

Deno.test('RuleMatcher - respects labels filter', () => {
  const rule: ReviewRule = {
    ...baseRule,
    trigger: { labels: ['security-review', 'audit-required'] },
  };

  const withLabel: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['src/index.ts'],
    isDraft: false,
    labels: ['bug', 'security-review'],
  };
  assertEquals(matchRuleTrigger(rule, withLabel), true);

  const withoutLabel: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['src/index.ts'],
    isDraft: false,
    labels: ['bug', 'enhancement'],
  };
  assertEquals(matchRuleTrigger(rule, withoutLabel), false);
});

Deno.test('RuleMatcher - filters matching rules from array', () => {
  const rules: ReviewRule[] = [
    { ...baseRule, id: 'r1', trigger: { paths: ['**/server/**'] } },
    { ...baseRule, id: 'r2', trigger: { paths: ['**/web/**'] } },
    { ...baseRule, id: 'r3', enabled: false },
  ];

  const event: PrEvaluationEvent = {
    eventType: 'opened',
    changedFiles: ['apps/server/src/index.ts'],
    isDraft: false,
  };

  const matched = filterMatchingRules(rules, event);
  assertEquals(matched.length, 1);
  assertEquals(matched[0].id, 'r1');
});
