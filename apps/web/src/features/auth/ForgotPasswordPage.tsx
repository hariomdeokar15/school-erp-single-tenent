import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchApi, isApiUnavailableError } from "../../lib/api-client";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await fetchApi("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch (requestError) {
      const status = (requestError as Error & { statusCode?: number })
        .statusCode;
      setError(
        status === 429
          ? t("recoveryRateLimited")
          : isApiUnavailableError(requestError)
            ? t("apiUnavailable")
            : t("recoveryRequestFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-slate-900">
          {t("forgotPassword")}
        </h1>
        <p className="mb-6 text-sm text-slate-600">{t("forgotPasswordHelp")}</p>
        {done ? (
          <p
            role="status"
            className="mb-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {t("recoveryGenericSuccess")}
          </p>
        ) : (
          <form onSubmit={submit}>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="recovery-email"
            >
              {t("email")}
            </label>
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mb-4 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            {error && (
              <p role="alert" className="mb-4 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={loading}
              className="min-h-11 w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {loading ? t("loading") : t("sendResetLink")}
            </button>
          </form>
        )}
        <Link
          className="mt-5 inline-block text-sm font-medium text-indigo-700 underline"
          to="/login"
        >
          {t("backToSignIn")}
        </Link>
      </section>
    </main>
  );
}
