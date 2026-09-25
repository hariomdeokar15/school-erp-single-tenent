import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { locales } from "@schoolerp/i18n";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: locales.en },
    hi: { translation: locales.hi },
    mr: { translation: locales.mr },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
