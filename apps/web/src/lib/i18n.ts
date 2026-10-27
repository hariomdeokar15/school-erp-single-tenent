import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { locales } from "@schoolerp/i18n";

const supportedLanguages = ["en", "hi", "mr"] as const;
type SupportedLanguage = (typeof supportedLanguages)[number];

function getInitialLanguage(): SupportedLanguage {
  try {
    const savedLanguage = localStorage.getItem("schoolerp.language");
    if (savedLanguage && supportedLanguages.includes(savedLanguage as SupportedLanguage)) {
      return savedLanguage as SupportedLanguage;
    }
  } catch {
    // Storage may be unavailable in restricted browser contexts; use English.
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: locales.en },
    hi: { translation: locales.hi },
    mr: { translation: locales.mr },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (!supportedLanguages.includes(language as SupportedLanguage)) return;
  try {
    localStorage.setItem("schoolerp.language", language);
  } catch {
    // Language selection remains active for this session without storage.
  }
});

export default i18n;
