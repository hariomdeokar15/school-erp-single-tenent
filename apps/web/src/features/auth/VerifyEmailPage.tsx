import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchApi, isApiUnavailableError } from "../../lib/api-client";
import { useAuth } from "./AuthContext";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = window.location.hash.slice(1);
    if (value) setToken(value);
    window.history.replaceState(null, "", window.location.pathname);
    setTokenReady(true);
  }, []);

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetchApi("/api/v1/auth/recovery-email/verification", {
        method: "POST",
        body: JSON.stringify({ currentPassword: password }),
      });
      setPassword("");
      setMessage(t("verificationLinkSent"));
    } catch (requestError) {
      setError(
        isApiUnavailableError(requestError)
          ? t("apiUnavailable")
          : t("verificationRequestFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmEmail() {
    setError("");
    setLoading(true);
    try {
      await fetchApi("/api/v1/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setToken("");
      setMessage(t("emailVerifiedSuccess"));
    } catch (requestError) {
      const status = (requestError as Error & { statusCode?: number })
        .statusCode;
      setError(
        status === 400
          ? t("verificationLinkInvalid")
          : isApiUnavailableError(requestError)
            ? t("apiUnavailable")
            : t("verificationLinkInvalid"),
      );
    } finally {
      setLoading(false);
    }
  }

  if (tokenReady && !token && !user) return <Navigate to="/login" replace />;
  if (tokenReady && !token && user?.mustChangePassword)
    return <Navigate to="/change-password" replace />;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-slate-900">
          {t("verifyRecoveryEmail")}
        </h1>
        {message && (
          <p
            role="status"
            className="mb-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}
        {!tokenReady ? (
          <p role="status" className="text-sm text-slate-600">
            {t("loading")}
          </p>
        ) : token ? (
          <button
            disabled={loading}
            onClick={() => void confirmEmail()}
            className="min-h-11 w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {loading ? t("loading") : t("confirmEmail")}
          </button>
        ) : user?.emailVerified ? (
          <p role="status" className="mb-5 text-sm text-emerald-800">
            {t("emailAlreadyVerified")}
          </p>
        ) : (
          <>
            <p className="mb-5 text-sm text-slate-600">
              {t("verifyRecoveryEmailHelp")}
            </p>
            <form onSubmit={requestLink}>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="current-password-verify"
              >
                {t("currentPassword")}
              </label>
              <input
                id="current-password-verify"
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mb-4 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2"
              />
              <button
                disabled={loading}
                className="min-h-11 w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {loading ? t("loading") : t("sendVerificationLink")}
              </button>
            </form>
          </>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <Link
          className="mt-5 inline-block text-sm font-medium text-indigo-700 underline"
          to="/"
        >
          {t("backToDashboard")}
        </Link>
      </section>
    </main>
  );
}
