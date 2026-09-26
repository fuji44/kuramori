import { assertEquals } from 'jsr:@std/assert@^1.0.11';
import type { ReviewRule } from '@kuramori/core';
import {
  matchRuleTrigger,
  filterMatchingRules,
  matchReviewTrigger,
  filterRulesByTriggers,
  type PrEvaluationEvent,
} from './rule-matcher.ts';

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

Deno.test('ReviewTriggerMatcher - matches repository and paths', () => {
  const trigger = {
    id: 'trig-1',
    name: 'Server Trigger',
    repository: 'fuji44/kuramori',
    paths: ['apps/server/**'],
    ruleIds: ['rule-server-1'],
    enabled: true,
  };

  // 一致するリポジトリとパス
  assertEquals(
    matchReviewTrigger(trigger, {
      eventType: 'synchronize',
      repository: 'fuji44/kuramori',
      changedFiles: ['apps/server/src/api.ts'],
      isDraft: false,
    }),
    true
  );

  // 異なるリポジトリ
  assertEquals(
    matchReviewTrigger(trigger, {
      eventType: 'synchronize',
      repository: 'other/repo',
      changedFiles: ['apps/server/src/api.ts'],
      isDraft: false,
    }),
    false
  );

  // リポジトリ一致だがパス不一致
  assertEquals(
    matchReviewTrigger(trigger, {
      eventType: 'synchronize',
      repository: 'fuji44/kuramori',
      changedFiles: ['apps/web/src/App.tsx'],
      isDraft: false,
    }),
    false
  );

  // '*' は全リポジトリ対象
  const wildcardTrigger = {
    ...trigger,
    repository: '*',
  };
  assertEquals(
    matchReviewTrigger(wildcardTrigger, {
      eventType: 'synchronize',
      repository: 'any-org/any-repo',
      changedFiles: ['apps/server/src/api.ts'],
      isDraft: false,
    }),
    true
  );
});

Deno.test('ReviewTriggerMatcher - filters rules by triggers', () => {
  const rules: ReviewRule[] = [
    { ...baseRule, id: 'rule-sec', name: 'Security' },
    { ...baseRule, id: 'rule-perf', name: 'Performance' },
    { ...baseRule, id: 'rule-disabled', name: 'Disabled', enabled: false },
  ];

  const triggers = [
    {
      id: 't1',
      name: 'Auth files',
      repository: 'org/backend',
      paths: ['**/auth/**'],
      ruleIds: ['rule-sec'],
      enabled: true,
    },
    {
      id: 't2',
      name: 'All files',
      repository: 'org/backend',
      ruleIds: ['rule-perf', 'rule-disabled'],
      enabled: true,
    },
  ];

  const matched = filterRulesByTriggers(triggers, rules, {
    eventType: 'synchronize',
    repository: 'org/backend',
    changedFiles: ['src/auth/login.ts'],
    isDraft: false,
  });

  assertEquals(matched.length, 2);
  assertEquals(matched.map((r) => r.id).sort(), ['rule-perf', 'rule-sec']);
});
