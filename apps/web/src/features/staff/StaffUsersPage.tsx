import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { UserRole } from "@schoolerp/contracts";
import { fetchApi } from "../../lib/api-client";

type UserRecord = {
  id: string;
  email: string;
  displayName: string;
  status: "ACTIVE" | "DISABLED";
  roles: string[];
  mustChangePassword: boolean;
};
type CreatedUserCredentials = {
  id: string;
  email: string;
  role: string;
  temporaryPassword: string;
};
type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

const roles = Object.values(UserRole);

export function StaffUsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedUserCredentials | null>(null);
  const users = useQuery({
    queryKey: ["staff-users"],
    queryFn: () =>
      fetchApi<PageResult<UserRecord>>(
        "/api/v1/auth/users?page=1&pageSize=100",
      ),
  });
  const createUser = useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetchApi<CreatedUserCredentials>("/api/v1/auth/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async (credentials) => {
      setShowCreate(false);
      setCreatedCredentials(credentials);
      setMessage(t("accountCreated"));
      await queryClient.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: () => setMessage(t("requestFailed")),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createUser.mutate({
      email: String(form.get("email") ?? "").trim(),
      displayName: String(form.get("displayName") ?? "").trim(),
      role: String(form.get("role") ?? ""),
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">
            {t("staffUsers")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {t("staffUsers")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("staffUsersDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((value) => !value);
            setMessage("");
            setCreatedCredentials(null);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          {t("createUser")}
        </button>
      </header>

      {showCreate && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <label className="text-sm font-medium text-slate-700">
            {t("email")}
            <input
              name="email"
              type="email"
              autoComplete="off"
              required
              maxLength={320}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t("displayName")}
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={120}
              autoComplete="off"
              className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t("userRole")}
            <select
              name="role"
              required
              defaultValue={UserRole.TEACHER}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {t(`role_${role}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2">
            {t("multiRoleAdminNote")}
          </p>
          <p className="text-xs text-slate-500 sm:col-span-2">
            {t("generatedPasswordNotice")}
          </p>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={createUser.isPending}
              className="min-h-11 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createUser.isPending ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="min-h-11 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-700"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
        >
          {message}
        </p>
      )}

      {createdCredentials && (
        <section
          aria-labelledby="new-account-credentials"
          className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <h2 id="new-account-credentials" className="font-semibold text-slate-900">
            {t("temporaryCredentials")}
          </h2>
          <p className="text-sm text-slate-700">{createdCredentials.email}</p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="select-all rounded bg-white px-3 py-2 font-mono text-sm">
              {createdCredentials.temporaryPassword}
            </code>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(
                  createdCredentials.temporaryPassword,
                )
              }
              className="min-h-10 rounded-lg border border-amber-300 bg-white px-3 text-sm font-medium"
            >
              {t("copyPassword")}
            </button>
          </div>
          <p className="text-xs text-slate-600">{t("generatedPasswordNotice")}</p>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {users.isLoading ? (
          <p className="p-8 text-center text-sm text-slate-500" role="status">
            {t("loading")}
          </p>
        ) : users.isError ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-red-700">
              {t("requestFailed")}
            </p>
            <button
              type="button"
              onClick={() => void users.refetch()}
              className="mt-3 min-h-10 rounded-lg border border-slate-200 px-4 text-sm"
            >
              {t("retry")}
            </button>
          </div>
        ) : users.data?.items.length ? (
          <div className="divide-y divide-slate-100">
            {users.data.items.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-slate-500">
            {t("noRecords")}
          </p>
        )}
      </section>
    </div>
  );
}

function UserRow({ user }: { user: UserRecord }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [role, setRole] = useState(user.roles[0] ?? UserRole.TEACHER);
  const [error, setError] = useState("");
  const update = useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetchApi(`/api/v1/auth/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: () => setError(t("requestFailed")),
  });
  const nextStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  return (
    <article className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">
          {user.displayName}
        </p>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
        <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
          {user.id}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {user.roles.map((item) => t(`role_${item}`)).join(" · ")} ·{" "}
          {user.status === "ACTIVE" ? t("active") : t("disabled")}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`role-${user.id}`}>
          {t("userRole")}
        </label>
        <select
          id={`role-${user.id}`}
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {t(`role_${item}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={update.isPending || user.roles.includes(role)}
          onClick={() => update.mutate({ role })}
          className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          {t("updateRecord")}
        </button>
        <button
          type="button"
          disabled={update.isPending}
          onClick={() => update.mutate({ status: nextStatus })}
          className={`min-h-10 rounded-lg border px-3 text-xs font-semibold ${user.status === "ACTIVE" ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
        >
          {user.status === "ACTIVE" ? t("disableAccount") : t("enableAccount")}
        </button>
      </div>
    </article>
  );
}
