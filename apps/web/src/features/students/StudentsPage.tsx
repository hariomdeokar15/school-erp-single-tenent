import { useDeferredValue, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, Search, UserPlus } from "lucide-react";
import { Permission } from "@schoolerp/contracts";
import { fetchApi } from "../../lib/api-client";
import { useAuth } from "../auth/AuthContext";
import { StudentField } from "./StudentField";
import { StudentStatusBadge } from "./StudentStatusBadge";

type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
type Student = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  dateOfBirth?: string | null;
};
type FamilyPortalAccount = {
  userId: string;
  displayName: string;
  email: string;
};
type FamilyPortalInput =
  | {
      action: "CREATE";
      guardianFirstName: string;
      guardianLastName: string;
      relationship: string;
      email: string;
      phone?: string;
      initialPassword: string;
    }
  | { action: "LINK_EXISTING"; relationship: string; userId: string };

export function StudentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canWrite =
    user?.permissions.includes(Permission.STUDENT_WRITE) ?? false;
  const role = user?.roles[0];
  const titleKey =
    role === "PARENT"
      ? "navMyChildren"
      : role === "STUDENT"
        ? "navMyRecord"
        : "navStudents";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());
  const [showCreate, setShowCreate] = useState(false);
  const [createFamilyPortal, setCreateFamilyPortal] = useState(true);
  const [familyPortalAction, setFamilyPortalAction] = useState<
    "CREATE" | "LINK_EXISTING"
  >("CREATE");
  const [formError, setFormError] = useState("");
  const familyPortalAccounts = useQuery({
    queryKey: ["family-portal-accounts"],
    queryFn: () =>
      fetchApi<FamilyPortalAccount[]>(
        "/api/v1/students/family-portal-accounts",
      ),
    enabled:
      showCreate &&
      createFamilyPortal &&
      familyPortalAction === "LINK_EXISTING",
  });

  const students = useQuery({
    queryKey: ["students", deferredSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      });
      if (deferredSearch) params.set("search", deferredSearch);
      return fetchApi<PageResult<Student>>(
        `/api/v1/students?${params.toString()}`,
      );
    },
  });
  const createStudent = useMutation({
    mutationFn: (input: {
      studentNumber: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      familyPortal?: FamilyPortalInput;
    }) =>
      fetchApi<Student>("/api/v1/students", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowCreate(false);
      navigate(`/students/${created.id}`);
    },
    onError: () => setFormError(t("requestFailed")),
  });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const data = new FormData(event.currentTarget);
    const dateOfBirth = String(data.get("dateOfBirth") ?? "");
    const relationship = String(data.get("relationship") ?? "").trim();
    const familyPortal: FamilyPortalInput | undefined = createFamilyPortal
      ? familyPortalAction === "CREATE"
        ? {
            action: "CREATE" as const,
            guardianFirstName: String(
              data.get("guardianFirstName") ?? "",
            ).trim(),
            guardianLastName: String(data.get("guardianLastName") ?? "").trim(),
            relationship,
            email: String(data.get("guardianEmail") ?? "").trim(),
            ...(String(data.get("guardianPhone") ?? "").trim()
              ? { phone: String(data.get("guardianPhone") ?? "").trim() }
              : {}),
            initialPassword: String(data.get("initialPassword") ?? ""),
          }
        : {
            action: "LINK_EXISTING" as const,
            relationship,
            userId: String(data.get("familyPortalUserId") ?? ""),
          }
      : undefined;
    createStudent.mutate({
      studentNumber: String(data.get("studentNumber") ?? "").trim(),
      firstName: String(data.get("firstName") ?? "").trim(),
      lastName: String(data.get("lastName") ?? "").trim(),
      ...(dateOfBirth ? { dateOfBirth } : {}),
      ...(familyPortal ? { familyPortal } : {}),
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">{t("students")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {t(titleKey)}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("studentsPageDescription")}
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setShowCreate((current) => !current);
              setFormError("");
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            {t("addStudent")}
          </button>
        )}
      </header>

      {showCreate && (
        <form
          onSubmit={submitCreate}
          className="grid gap-4 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <StudentField
            name="studentNumber"
            label={t("studentNumber")}
            required
          />
          <StudentField name="firstName" label={t("firstName")} required />
          <StudentField name="lastName" label={t("lastName")} required />
          <StudentField
            name="dateOfBirth"
            label={t("dateOfBirth")}
            type="date"
          />
          <fieldset className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:col-span-2 lg:col-span-4">
            <legend className="px-1 text-sm font-semibold text-slate-900">
              {t("familyPortalLogin")}
            </legend>
            <label className="flex min-h-10 items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={createFamilyPortal}
                onChange={(event) =>
                  setCreateFamilyPortal(event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {t("createFamilyPortalLogin")}
            </label>
            {createFamilyPortal && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-sm font-medium text-slate-700">
                  {t("familyPortalAccount")}
                  <select
                    value={familyPortalAction}
                    onChange={(event) =>
                      setFamilyPortalAction(
                        event.target.value as "CREATE" | "LINK_EXISTING",
                      )
                    }
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                  >
                    <option value="CREATE">{t("createNewFamilyLogin")}</option>
                    <option value="LINK_EXISTING">
                      {t("useExistingFamilyLogin")}
                    </option>
                  </select>
                </label>
                {familyPortalAction === "CREATE" ? (
                  <>
                    <StudentField
                      name="guardianFirstName"
                      label="guardianFirstName"
                      required
                    />
                    <StudentField
                      name="guardianLastName"
                      label="guardianLastName"
                      required
                    />
                    <StudentField
                      name="guardianEmail"
                      label="email"
                      type="email"
                      required
                    />
                    <StudentField
                      name="guardianPhone"
                      label="phone"
                      type="tel"
                    />
                    <StudentField
                      name="initialPassword"
                      label="initialPassword"
                      type="password"
                      minLength={12}
                      required
                    />
                  </>
                ) : (
                  <label className="block text-sm font-medium text-slate-700">
                    {t("familyPortalAccount")}
                    <select
                      name="familyPortalUserId"
                      required
                      className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                    >
                      <option value="">{t("selectOption")}</option>
                      {familyPortalAccounts.data?.map((account) => (
                        <option key={account.userId} value={account.userId}>
                          {account.displayName} ({account.email})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {(familyPortalAction === "CREATE" ||
                  familyPortalAction === "LINK_EXISTING") && (
                  <StudentField
                    name="relationship"
                    label="relationship"
                    required
                  />
                )}
                <p className="text-xs text-slate-600 sm:col-span-2 lg:col-span-3">
                  {t("familyPortalLoginHelp")}
                </p>
              </div>
            )}
          </fieldset>
          {formError && (
            <p
              role="alert"
              className="text-sm text-red-700 sm:col-span-2 lg:col-span-4"
            >
              {formError}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={createStudent.isPending}
              className="min-h-11 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createStudent.isPending ? t("saving") : t("save")}
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

      <label className="relative block max-w-xl">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <span className="sr-only">{t("searchStudents")}</span>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={t("searchStudents")}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {students.isLoading ? (
          <p className="p-8 text-center text-sm text-slate-500" role="status">
            {t("loading")}
          </p>
        ) : students.isError ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-red-700">
              {t("requestFailed")}
            </p>
            <button
              type="button"
              onClick={() => void students.refetch()}
              className="mt-3 min-h-10 rounded-lg border border-slate-200 px-4 text-sm"
            >
              {t("retry")}
            </button>
          </div>
        ) : students.data?.items.length ? (
          <>
            <div className="hidden grid-cols-[1.1fr_2fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
              <span>{t("studentNumber")}</span>
              <span>{t("studentName")}</span>
              <span>{t("studentStatus")}</span>
              <span className="sr-only">{t("details")}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {students.data.items.map((student) => (
                <Link
                  key={student.id}
                  to={`/students/${student.id}`}
                  className="grid min-h-16 gap-2 px-4 py-4 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:grid-cols-[1.1fr_2fr_1fr_auto] sm:items-center sm:gap-4 sm:px-5"
                >
                  <span className="font-mono text-xs text-slate-500">
                    {student.studentNumber}
                  </span>
                  <span className="font-medium text-slate-900">
                    {student.firstName} {student.lastName}
                  </span>
                  <span>
                    <StudentStatusBadge status={student.status} />
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="hidden h-4 w-4 text-slate-400 sm:block"
                  />
                </Link>
              ))}
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center">
              <span>
                {students.data.total} {t("records")}
              </span>
              <nav
                className="flex items-center justify-between gap-3 sm:justify-end"
                aria-label={t("pagination")}
              >
                <span>
                  {t("pageOf", {
                    page: students.data.page,
                    pages: Math.max(
                      1,
                      Math.ceil(students.data.total / students.data.pageSize),
                    ),
                  })}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={students.data.page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
                  >
                    {t("previous")}
                  </button>
                  <button
                    type="button"
                    disabled={
                      students.data.page * students.data.pageSize >=
                      students.data.total
                    }
                    onClick={() => setPage((current) => current + 1)}
                    className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
                  >
                    {t("next")}
                  </button>
                </div>
              </nav>
            </div>
          </>
        ) : (
          <p className="p-10 text-center text-sm text-slate-500">
            {t("noStudents")}
          </p>
        )}
      </section>
    </div>
  );
}
