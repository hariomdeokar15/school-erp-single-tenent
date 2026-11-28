import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { locales, SupportedLanguage } from "@schoolerp/i18n";
import { useAuth } from "../../features/auth/AuthContext";

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

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
        {user && (
          <span className="text-sm text-slate-600">{user.displayName}</span>
        )}
        <button
          type="button"
          onClick={() => void logout().catch(() => undefined)}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
        >
          {t("signOut")}
        </button>
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
          <option value="hi">{locales.hi.hindi} (Hindi)</option>
          <option value="mr">{locales.mr.marathi} (Marathi)</option>
        </select>
      </div>
    </header>
  );
};
