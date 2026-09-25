import en from "./locales/en";
import hi from "./locales/hi";
import mr from "./locales/mr";

export const locales = {
  en,
  hi,
  mr,
} as const;

export type SupportedLanguage = keyof typeof locales;
export type TranslationKey = keyof typeof en;
