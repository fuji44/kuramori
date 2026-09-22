import { globToRegExp } from 'jsr:@std/path/glob-to-regexp';
import type { ReviewRule, ReviewTrigger } from '@review-base/core';

export interface PrEvaluationEvent {
  eventType: 'opened' | 'synchronize' | 'reopened' | 'ready_for_review';
  repository?: string;
  changedFiles: string[];
  isDraft: boolean;
  labels?: string[];
}

/**
 * PR のイベントおよび変更内容がルールのトリガー条件を満たすかを判定する
 */
export function matchRuleTrigger(rule: ReviewRule, event: PrEvaluationEvent): boolean {
  if (!rule.enabled) {
    return false;
  }

  const trigger = rule.trigger;
  if (!trigger) {
    return true;
  }

  // イベント種別判定
  if (trigger.types && trigger.types.length > 0) {
    if (!trigger.types.includes(event.eventType)) {
      return false;
    }
  }

  // Draft 状態判定: trigger.draft が false の場合、Draft PR では発動しない
  if (trigger.draft === false && event.isDraft) {
    return false;
  }

  // ラベル判定: 指定がある場合、PR のいずれかのラベルと一致する必要がある
  if (trigger.labels && trigger.labels.length > 0) {
    const eventLabels = event.labels ?? [];
    const hasMatchingLabel = trigger.labels.some((l) => eventLabels.includes(l));
    if (!hasMatchingLabel) {
      return false;
    }
  }

  // パス判定: paths が指定されている場合、変更ファイルのいずれかがパターンに合致する必要がある
  if (trigger.paths && trigger.paths.length > 0) {
    const pathRegexes = trigger.paths.map((pattern) => globToRegExp(pattern, { extended: true, globstar: true }));
    const matchesAnyPath = event.changedFiles.some((file) =>
      pathRegexes.some((regex) => regex.test(file))
    );
    if (!matchesAnyPath) {
      return false;
    }
  }

  // 除外パス判定: pathsIgnore が指定されている場合、すべての変更ファイルが除外対象であればスキップ
  if (trigger.pathsIgnore && trigger.pathsIgnore.length > 0) {
    const ignoreRegexes = trigger.pathsIgnore.map((pattern) => globToRegExp(pattern, { extended: true, globstar: true }));
    const allFilesIgnored = event.changedFiles.length > 0 && event.changedFiles.every((file) =>
      ignoreRegexes.some((regex) => regex.test(file))
    );
    if (allFilesIgnored) {
      return false;
    }
  }

  return true;
}

/**
 * 登録されているルール一覧から、PR イベントに適合するルールを抽出する
 */
export function filterMatchingRules(rules: ReviewRule[], event: PrEvaluationEvent): ReviewRule[] {
  return rules.filter((rule) => matchRuleTrigger(rule, event));
}

/**
 * PR のイベント・リポジトリ・変更パスがレビュートリガー条件を満たすかを判定する
 */
export function matchReviewTrigger(trigger: ReviewTrigger, event: PrEvaluationEvent): boolean {
  if (!trigger.enabled) {
    return false;
  }

  // リポジトリ判定: '*' は全リポジトリにマッチ、それ以外は完全一致（大文字小文字無視）
  if (trigger.repository && trigger.repository !== '*' && event.repository) {
    if (trigger.repository.toLowerCase() !== event.repository.toLowerCase()) {
      return false;
    }
  }

  // パス判定: paths が指定されている場合、変更ファイルのいずれかがパターンに合致する必要がある
  if (trigger.paths && trigger.paths.length > 0) {
    const pathRegexes = trigger.paths.map((pattern) =>
      globToRegExp(pattern, { extended: true, globstar: true })
    );
    const matchesAnyPath = event.changedFiles.some((file) =>
      pathRegexes.some((regex) => regex.test(file))
    );
    if (!matchesAnyPath) {
      return false;
    }
  }

  // 除外パス判定: pathsIgnore が指定されている場合、すべての変更ファイルが除外対象であればスキップ
  if (trigger.pathsIgnore && trigger.pathsIgnore.length > 0) {
    const ignoreRegexes = trigger.pathsIgnore.map((pattern) =>
      globToRegExp(pattern, { extended: true, globstar: true })
    );
    const allFilesIgnored =
      event.changedFiles.length > 0 &&
      event.changedFiles.every((file) =>
        ignoreRegexes.some((regex) => regex.test(file))
      );
    if (allFilesIgnored) {
      return false;
    }
  }

  return true;
}

/**
 * 登録されているトリガー一覧から、PR イベントに適合するルール一覧を抽出する
 */
export function filterRulesByTriggers(
  triggers: ReviewTrigger[],
  rules: ReviewRule[],
  event: PrEvaluationEvent
): ReviewRule[] {
  const matchedTriggers = triggers.filter((t) => matchReviewTrigger(t, event));
  const matchedRuleIds = new Set<string>();
  for (const t of matchedTriggers) {
    for (const ruleId of t.ruleIds) {
      matchedRuleIds.add(ruleId);
    }
  }
  return rules.filter((r) => r.enabled && matchedRuleIds.has(r.id));
}
