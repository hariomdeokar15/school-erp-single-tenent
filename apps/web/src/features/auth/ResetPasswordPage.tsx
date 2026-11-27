import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchApi, isApiUnavailableError } from "../../lib/api-client";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = window.location.hash.slice(1);
    if (value) setToken(value);
    window.history.replaceState(null, "", window.location.pathname);
    setTokenReady(true);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      await fetchApi("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setToken("");
      setPassword("");
      setConfirm("");
      setDone(true);
    } catch (requestError) {
      const status = (requestError as Error & { statusCode?: number })
        .statusCode;
      setError(
        status === 400
          ? t("resetLinkInvalid")
          : isApiUnavailableError(requestError)
            ? t("apiUnavailable")
            : t("resetPasswordFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-slate-900">
          {t("resetPassword")}
        </h1>
        {done ? (
          <div>
            <p
              role="status"
              className="mb-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {t("resetPasswordSuccess")}
            </p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="min-h-11 w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white"
            >
              {t("backToSignIn")}
            </button>
          </div>
        ) : !tokenReady ? (
          <p role="status" className="text-sm text-slate-600">
            {t("loading")}
          </p>
        ) : token ? (
          <form onSubmit={submit}>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="new-password"
            >
              {t("newPassword")}
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mb-4 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="confirm-password"
            >
              {t("confirmPassword")}
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
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
              {loading ? t("loading") : t("resetPassword")}
            </button>
          </form>
        ) : (
          <div>
            <p role="alert" className="mb-5 text-sm text-red-700">
              {t("resetLinkInvalid")}
            </p>
            <Link
              className="text-sm font-medium text-indigo-700 underline"
              to="/forgot-password"
            >
              {t("requestAnotherReset")}
            </Link>
          </div>
        )}
        {!done && (
          <Link
            className="mt-5 inline-block text-sm font-medium text-indigo-700 underline"
            to="/login"
          >
            {t("backToSignIn")}
          </Link>
        )}
      </section>
    </main>
  );
}
