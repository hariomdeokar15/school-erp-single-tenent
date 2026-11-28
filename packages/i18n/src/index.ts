import en from "./locales/en";
import hi from "./locales/hi";
import mr from "./locales/mr";

export type SupportedLanguage = "en" | "hi" | "mr";

type LocaleMessages = { [Key in keyof typeof en]: string };

export const locales: Record<SupportedLanguage, LocaleMessages> = {
  en,
  hi,
  mr,
};

export type TranslationKey = keyof typeof en;
