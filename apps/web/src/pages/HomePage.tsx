import React from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { HealthStatusWidget } from "../features/health/HealthStatusWidget";

export const HomePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
            {t("appName")}
          </h2>
          <p className="text-slate-600 max-w-lg">
            Production-grade, single-tenant operating system for Indian K-12
            schools.
          </p>
        </div>

        <HealthStatusWidget />
      </main>
    </div>
  );
};
