import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function PermissionRoute({
  permission,
  children,
}: React.PropsWithChildren<{ permission: string }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.permissions.includes(permission)) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-amber-950">
          {t("accessUnavailable")}
        </h1>
        <p className="mt-2 text-sm text-amber-900">{t("forbidden")}</p>
      </section>
    );
  }
  return <>{children}</>;
}
