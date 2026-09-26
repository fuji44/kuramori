import type { Locale } from './types.ts';

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>();

function getDateTimeFormatter(locale: Locale, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}_${JSON.stringify(options ?? {})}`;
  const cached = dateTimeFormatCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(locale, options);
  dateTimeFormatCache.set(key, formatter);
  return formatter;
}

function getNumberFormatter(locale: Locale, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}_${JSON.stringify(options ?? {})}`;
  const cached = numberFormatCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const formatter = new Intl.NumberFormat(locale, options);
  numberFormatCache.set(key, formatter);
  return formatter;
}

function getRelativeTimeFormatter(
  locale: Locale,
  options?: Intl.RelativeTimeFormatOptions
): Intl.RelativeTimeFormat {
  const key = `${locale}_${JSON.stringify(options ?? {})}`;
  const cached = relativeTimeFormatCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const formatter = new Intl.RelativeTimeFormat(locale, options ?? { numeric: 'auto' });
  relativeTimeFormatCache.set(key, formatter);
  return formatter;
}

export function formatDate(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const parsedDate = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return getDateTimeFormatter(locale, options).format(parsedDate);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  return getNumberFormatter(locale, options).format(value);
}

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: Locale,
  options?: Intl.RelativeTimeFormatOptions
): string;
export function formatRelativeTime(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.RelativeTimeFormatOptions
): string;
export function formatRelativeTime(
  dateOrValue: Date | string | number,
  unitOrLocale: Intl.RelativeTimeFormatUnit | Locale,
  localeOrOptions?: Locale | Intl.RelativeTimeFormatOptions,
  options?: Intl.RelativeTimeFormatOptions
): string {
  const validUnits: string[] = [
    'year', 'years', 'quarter', 'quarters', 'month', 'months',
    'week', 'weeks', 'day', 'days', 'hour', 'hours',
    'minute', 'minutes', 'second', 'seconds',
  ];

  if (
    typeof dateOrValue === 'number' &&
    typeof unitOrLocale === 'string' &&
    validUnits.includes(unitOrLocale)
  ) {
    const locale = (typeof localeOrOptions === 'string' ? localeOrOptions : 'en') as Locale;
    return getRelativeTimeFormatter(locale, options).format(dateOrValue, unitOrLocale as Intl.RelativeTimeFormatUnit);
  }

  const date = typeof dateOrValue === 'string' || typeof dateOrValue === 'number' ? new Date(dateOrValue) : dateOrValue;
  const locale = (typeof unitOrLocale === 'string' && !validUnits.includes(unitOrLocale)
    ? unitOrLocale
    : typeof localeOrOptions === 'string'
    ? localeOrOptions
    : 'en') as Locale;
  const opts = typeof localeOrOptions === 'object' ? localeOrOptions : options;

  if (isNaN(date.getTime())) {
    return '';
  }

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffSeconds = Math.round(diffMs / 1000);
  const absDiffSeconds = Math.abs(diffSeconds);

  if (absDiffSeconds < 60) {
    return getRelativeTimeFormatter(locale, opts).format(diffSeconds, 'second');
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  const absDiffMinutes = Math.abs(diffMinutes);
  if (absDiffMinutes < 60) {
    return getRelativeTimeFormatter(locale, opts).format(diffMinutes, 'minute');
  }
  const diffHours = Math.round(diffMinutes / 60);
  const absDiffHours = Math.abs(diffHours);
  if (absDiffHours < 24) {
    return getRelativeTimeFormatter(locale, opts).format(diffHours, 'hour');
  }
  const diffDays = Math.round(diffHours / 24);
  const absDiffDays = Math.abs(diffDays);
  if (absDiffDays < 30) {
    return getRelativeTimeFormatter(locale, opts).format(diffDays, 'day');
  }
  const diffMonths = Math.round(diffDays / 30);
  const absDiffMonths = Math.abs(diffMonths);
  if (absDiffMonths < 12) {
    return getRelativeTimeFormatter(locale, opts).format(diffMonths, 'month');
  }
  const diffYears = Math.round(diffDays / 365);
  return getRelativeTimeFormatter(locale, opts).format(diffYears, 'year');
}
