import type { en } from './locales/en.ts';

export type Locale = 'en' | 'ja';
export type LocalePreference = 'auto' | 'en' | 'ja';

type StringifyLeaves<T> = {
  [K in keyof T]: T[K] extends object ? StringifyLeaves<T[K]> : string;
};

export type TranslationSchema = StringifyLeaves<typeof en>;

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationSchema>;

export type InterpolationParams = Record<string, string | number>;
