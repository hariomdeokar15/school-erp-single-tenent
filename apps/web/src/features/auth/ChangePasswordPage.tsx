import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate("/login", { replace: true, state: { passwordChanged: true } });
    } catch {
      setError(t("passwordChangeFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            {t("changePassword")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("temporaryPasswordNotice")}
          </p>
        </div>
        <PasswordField
          name="currentPassword"
          label={t("currentPassword")}
          autoComplete="current-password"
        />
        <PasswordField
          name="newPassword"
          label={t("newPassword")}
          autoComplete="new-password"
          minLength={8}
        />
        <PasswordField
          name="confirmPassword"
          label={t("confirmPassword")}
          autoComplete="new-password"
          minLength={8}
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? t("saving") : t("changePassword")}
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-10 w-full text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          {t("signOut")}
        </button>
      </form>
    </main>
  );
}

function PasswordField({
  name,
  label,
  autoComplete,
  minLength,
}: {
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={minLength}
        maxLength={128}
        className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3"
      />
    </label>
  );
}
