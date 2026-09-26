import { assertEquals } from '@std/assert';
import {
  createTranslator,
  resolveLocale,
  formatDate,
  formatNumber,
  formatRelativeTime,
} from './index.ts';

Deno.test('resolveLocale - preference explicitly set', () => {
  assertEquals(resolveLocale('en', 'ja-JP'), 'en');
  assertEquals(resolveLocale('ja', 'en-US'), 'ja');
});

Deno.test('resolveLocale - auto preference with browser language', () => {
  assertEquals(resolveLocale('auto', 'ja'), 'ja');
  assertEquals(resolveLocale('auto', 'ja-JP'), 'ja');
  assertEquals(resolveLocale('auto', 'en-US'), 'en');
  assertEquals(resolveLocale('auto', 'fr-FR'), 'en'); // Non-ja falls back to en
  assertEquals(resolveLocale('auto', undefined), 'en'); // Missing falls back to en
});

Deno.test('createTranslator - translates basic keys', () => {
  const tEn = createTranslator('en');
  const tJa = createTranslator('ja');

  assertEquals(tEn('nav.dashboard'), 'Dashboard');
  assertEquals(tJa('nav.dashboard'), 'ダッシュボード');
  assertEquals(tEn('common.save'), 'Save');
  assertEquals(tJa('common.save'), '保存');
});

Deno.test('createTranslator - interpolates parameters', () => {
  const tEn = createTranslator('en');
  const tJa = createTranslator('ja');

  assertEquals(
    tEn('toast.reviewQueuedWithRules', { count: 3 }),
    'Queued 3 rules for AI review'
  );
  assertEquals(
    tJa('toast.reviewQueuedWithRules', { count: 3 }),
    '3 件のルールをキューに投入しました'
  );
});

Deno.test('createTranslator - falls back to English when key missing or unknown', () => {
  const tJa = createTranslator('ja');
  assertEquals(tJa('non.existent.key'), 'non.existent.key');
});

Deno.test('formatters - formatDate outputs formatted string', () => {
  const testDate = new Date('2026-09-27T00:00:00Z');
  const formattedEn = formatDate(testDate, 'en', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
  const formattedJa = formatDate(testDate, 'ja', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });

  assertEquals(typeof formattedEn, 'string');
  assertEquals(typeof formattedJa, 'string');
});

Deno.test('formatters - formatNumber outputs formatted number', () => {
  assertEquals(formatNumber(1000, 'en'), '1,000');
  assertEquals(formatNumber(1000, 'ja'), '1,000');
});

Deno.test('formatters - formatRelativeTime outputs relative string', () => {
  const relEn = formatRelativeTime(-1, 'day', 'en');
  const relJa = formatRelativeTime(-1, 'day', 'ja');

  assertEquals(relEn, 'yesterday');
  assertEquals(relJa, '昨日');

  // Test with Date object
  const oneHourAgo = new Date(Date.now() - 3600 * 1000);
  const relDateEn = formatRelativeTime(oneHourAgo, 'en');
  const relDateJa = formatRelativeTime(oneHourAgo, 'ja');

  assertEquals(typeof relDateEn, 'string');
  assertEquals(typeof relDateJa, 'string');
  assertEquals(relDateEn.includes('hour'), true);
  assertEquals(relDateJa.includes('時間'), true);
});
