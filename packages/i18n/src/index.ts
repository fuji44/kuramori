export {
  createTranslator,
  resolveLocale,
} from './translator.ts';

export {
  formatDate,
  formatNumber,
  formatRelativeTime,
} from './formatters.ts';

export type {
  InterpolationParams,
  Locale,
  LocalePreference,
  NestedKeyOf,
  TranslationKey,
  TranslationSchema,
} from './types.ts';

export { en } from './locales/en.ts';
export { ja } from './locales/ja.ts';
