import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import {
  createTranslator,
  resolveLocale,
  formatDate as formatWithIntlDate,
  formatNumber as formatWithIntlNumber,
  formatRelativeTime as formatWithIntlRelativeTime,
  type InterpolationParams,
  type Locale,
  type LocalePreference,
  type TranslationKey,
} from '@kuramori/i18n';

interface I18nContextValue {
  locale: Locale;
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
  t: (key: TranslationKey | (string & { _?: never }), params?: InterpolationParams) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: {
    (date: Date | string | number, options?: Intl.RelativeTimeFormatOptions): string;
    (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
  };
}

const STORAGE_KEY = 'kuramori_locale';

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialPreference(): LocalePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ja' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Local storage access may fail in restricted environments
  }
  return 'auto';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>(getInitialPreference);

  const locale = useMemo(() => {
    const browserLang = typeof navigator !== 'undefined' ? navigator.language : undefined;
    return resolveLocale(preference, browserLang);
  }, [preference]);

  const setPreference = (newPref: LocalePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, newPref);
    } catch {
      // Local storage access may fail
    }
    setPreferenceState(newPref);
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const formatDate = useMemo(() => {
    return (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatWithIntlDate(date, locale, options);
  }, [locale]);

  const formatNumber = useMemo(() => {
    return (val: number, options?: Intl.NumberFormatOptions) =>
      formatWithIntlNumber(val, locale, options);
  }, [locale]);

  const formatRelativeTime = useMemo(() => {
    return ((
      dateOrVal: Date | string | number,
      unitOrOptions?: Intl.RelativeTimeFormatUnit | Intl.RelativeTimeFormatOptions,
      options?: Intl.RelativeTimeFormatOptions
    ) => {
      if (typeof unitOrOptions === 'string') {
        return formatWithIntlRelativeTime(dateOrVal as number, unitOrOptions, locale, options);
      }
      return formatWithIntlRelativeTime(dateOrVal, locale, unitOrOptions);
    }) as I18nContextValue['formatRelativeTime'];
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      preference,
      setPreference,
      t,
      formatDate,
      formatNumber,
      formatRelativeTime,
    }),
    [locale, preference, t, formatDate, formatNumber, formatRelativeTime]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context === null) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
