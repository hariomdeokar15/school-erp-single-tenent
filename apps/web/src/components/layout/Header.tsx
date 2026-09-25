import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { SupportedLanguage } from "@schoolerp/i18n";

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value as SupportedLanguage);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600 text-white font-bold text-lg px-3 py-1 rounded-md">
          ERP
        </div>
        <h1 className="text-xl font-bold text-slate-800">{t("appName")}</h1>
      </div>

      <div className="flex items-center space-x-2">
        <Globe className="w-5 h-5 text-slate-500" />
        <label htmlFor="language-select" className="sr-only">
          {t("languageSwitcher")}
        </label>
        <select
          id="language-select"
          value={i18n.language}
          onChange={handleLanguageChange}
          className="bg-slate-100 border border-slate-300 rounded-md px-3 py-1 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="mr">मराठी (Marathi)</option>
        </select>
      </div>
    </header>
  );
};
