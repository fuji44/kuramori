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
): string {
  return getRelativeTimeFormatter(locale, options).format(value, unit);
}
