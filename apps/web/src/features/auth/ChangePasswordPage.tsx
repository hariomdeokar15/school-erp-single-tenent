import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await changePassword(currentPassword, newPassword);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-slate-200"
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          {t("changePassword")}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          {t("temporaryPasswordNotice")}
        </p>
        <label
          className="block text-sm font-medium text-slate-700 mb-2"
          htmlFor="current-password"
        >
          {t("currentPassword")}
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 mb-4"
        />
        <label
          className="block text-sm font-medium text-slate-700 mb-2"
          htmlFor="new-password"
        >
          {t("newPassword")}
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 mb-5"
        />
        {error && (
          <p role="alert" className="text-sm text-red-700 mb-4">
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {loading ? t("loading") : t("changePassword")}
        </button>
      </form>
    </main>
  );
}
