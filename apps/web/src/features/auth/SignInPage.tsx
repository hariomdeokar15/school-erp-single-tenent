import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";

export function SignInPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch {
      setError(t("authFailed"));
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {t("signIn")}
        </h1>
        <label
          className="block text-sm font-medium text-slate-700 mb-2"
          htmlFor="email"
        >
          {t("email")}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 mb-4"
        />
        <label
          className="block text-sm font-medium text-slate-700 mb-2"
          htmlFor="password"
        >
          {t("password")}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
          {loading ? t("loading") : t("signIn")}
        </button>
      </form>
    </main>
  );
}
