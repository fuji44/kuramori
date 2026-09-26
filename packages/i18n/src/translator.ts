import { en } from './locales/en.ts';
import { ja } from './locales/ja.ts';
import type {
  InterpolationParams,
  Locale,
  LocalePreference,
  TranslationKey,
} from './types.ts';

const dictionaries = {
  en,
  ja,
};

export function resolveLocale(
  preference: LocalePreference,
  browserLanguage?: string
): Locale {
  if (preference === 'en' || preference === 'ja') {
    return preference;
  }
  if (browserLanguage !== undefined && browserLanguage.toLowerCase().startsWith('ja')) {
    return 'ja';
  }
  return 'en';
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function createTranslator(locale: Locale) {
  const currentDict = dictionaries[locale];
  const fallbackDict = dictionaries.en;

  return (key: TranslationKey | (string & {}), params?: InterpolationParams): string => {
    let rawText = getNestedValue(currentDict as unknown as Record<string, unknown>, key);

    if (typeof rawText !== 'string') {
      rawText = getNestedValue(fallbackDict as unknown as Record<string, unknown>, key);
    }

    if (typeof rawText !== 'string') {
      return key;
    }

    if (params === undefined) {
      return rawText;
    }

    let result = rawText;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
    return result;
  };
}
