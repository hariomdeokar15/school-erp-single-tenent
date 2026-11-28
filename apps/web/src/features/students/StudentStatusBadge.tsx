import { useTranslation } from "react-i18next";

export function StudentStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
    >
      {t(status.toLowerCase()) === status.toLowerCase()
        ? status
        : t(status.toLowerCase())}
    </span>
  );
}
