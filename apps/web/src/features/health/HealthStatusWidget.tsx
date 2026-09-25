import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { HealthStatusResponse } from "@schoolerp/contracts";
import { fetchApi } from "../../lib/api-client";
import { Activity, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

export const HealthStatusWidget: React.FC = () => {
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery<HealthStatusResponse>({
    queryKey: ["api-health"],
    queryFn: () => fetchApi<HealthStatusResponse>("/api/v1/health"),
  });

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-md w-full">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {t("healthStatus")}
          </h2>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
          title={t("retry")}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading && (
        <div className="py-6 text-center text-slate-500">
          <p className="text-sm font-medium">{t("loading")}</p>
        </div>
      )}

      {isError && (
        <div className="py-4 px-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{t("apiUnavailable")}</p>
            <p className="text-xs text-amber-700 mt-1">{t("error")}</p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Status</span>
            <span className="flex items-center space-x-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t("statusHealthy")}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Service</span>
            <span className="font-mono text-slate-800">{data.service}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Version</span>
            <span className="font-mono text-slate-800">{data.version}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Uptime</span>
            <span className="font-mono text-slate-800">
              {data.uptimeSeconds}s
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-400">
            <span>Correlation ID</span>
            <span className="font-mono truncate max-w-[150px]">
              {data.correlationId}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
