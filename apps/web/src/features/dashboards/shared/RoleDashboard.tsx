import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, GraduationCap, Users } from "lucide-react";
import { Permission } from "@schoolerp/contracts";
import { fetchApi } from "../../../lib/api-client";
import { useAuth } from "../../auth/AuthContext";
import { HealthStatusWidget } from "../../health/HealthStatusWidget";

type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type StudentSummary = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: string;
};

type AcademicYearSummary = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type AssignmentSummary = { id: string };

type RoleDashboardProps = { role?: string; roles?: string[] };

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

export function RoleDashboard({ role, roles }: RoleDashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const roleKeys = roles ?? (role ? [role] : (user?.roles ?? []));
  const hasRole = (...expected: string[]) =>
    expected.some((item) => roleKeys.includes(item));
  const canReadStudents =
    user?.permissions.includes(Permission.STUDENT_READ) ?? false;
  const canReadAcademic =
    user?.permissions.includes(Permission.ACADEMIC_READ) ?? false;
  const canManageUsers =
    user?.permissions.includes(Permission.USER_MANAGE) ?? false;

  const students = useQuery({
    queryKey: ["dashboard", "students"],
    queryFn: () =>
      fetchApi<PageResult<StudentSummary>>(
        "/api/v1/students?page=1&pageSize=1",
      ),
    enabled: canReadStudents,
  });
  const academicYears = useQuery({
    queryKey: ["dashboard", "academic-years"],
    queryFn: () =>
      fetchApi<PageResult<AcademicYearSummary>>(
        "/api/v1/academic/years?page=1&pageSize=1",
      ),
    enabled: canReadAcademic,
  });
  const assignments = useQuery({
    queryKey: ["dashboard", "teacher-assignments"],
    queryFn: () =>
      fetchApi<PageResult<AssignmentSummary>>(
        "/api/v1/academic/teacher-assignments?page=1&pageSize=1",
      ),
    enabled: hasRole("TEACHER"),
  });

  const elevated = hasRole("OWNER", "PRINCIPAL", "ADMIN");
  const parent = hasRole("PARENT");
  const student = hasRole("STUDENT");
  const teacher = hasRole("TEACHER");
  const admissions = hasRole("ADMISSIONS_OFFICER");
  const showApiPanel = elevated || teacher || parent || student || admissions;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">
            {roleKeys.map((item) => t(`role_${item}`)).join(" · ")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {t("welcomeBack")}, {user?.displayName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("workspaceDescription")}
          </p>
        </div>
        <p className="text-xs text-slate-500">{t("dataFromSchoolApi")}</p>
      </section>

      {showApiPanel ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {elevated && (
            <MetricCard
              label={t("academicYears")}
              value={
                academicYears.isLoading
                  ? "—"
                  : (academicYears.data?.total ?? "—")
              }
              icon={BookOpen}
            />
          )}
          {canReadStudents && (
            <MetricCard
              label={
                parent
                  ? t("linkedChildren")
                  : student
                    ? t("navMyRecord")
                    : t("studentsInScope")
              }
              value={students.isLoading ? "—" : (students.data?.total ?? "—")}
              icon={GraduationCap}
            />
          )}
          {teacher && (
            <MetricCard
              label={t("teacherAssignments")}
              value={
                assignments.isLoading ? "—" : (assignments.data?.total ?? "—")
              }
              icon={Users}
            />
          )}
          {(students.isError ||
            academicYears.isError ||
            assignments.isError) && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2 xl:col-span-3"
            >
              {t("dashboardDataUnavailable")}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-medium text-slate-900">{t("moduleUnavailable")}</p>
          <p className="mt-2 text-sm text-slate-500">
            {t("moduleUnavailableDescription")}
          </p>
        </section>
      )}

      {elevated && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {t("quickActions")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickLink
              to="/academic"
              icon={BookOpen}
              label={t("academicSetup")}
            />
            <QuickLink
              to="/students"
              icon={GraduationCap}
              label={t("navStudents")}
            />
            {canManageUsers && (
              <QuickLink
                to="/staff-users"
                icon={Users}
                label={t("navStaffUsers")}
              />
            )}
          </div>
        </section>
      )}

      {(teacher || parent || student || admissions) && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {t("yourWorkspace")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {teacher && (
              <QuickLink
                to="/my-classes"
                icon={BookOpen}
                label={t("navMyClasses")}
              />
            )}
            {(parent || student || admissions) && (
              <QuickLink
                to="/students"
                icon={GraduationCap}
                label={t(
                  parent
                    ? "navMyChildren"
                    : student
                      ? "navMyRecord"
                      : "navStudents",
                )}
              />
            )}
          </div>
        </section>
      )}

      {hasRole("ACCOUNTANT") && <UnavailableModuleCard title={t("navFees")} />}
      {hasRole("TRANSPORT_MANAGER") && (
        <UnavailableModuleCard title={t("navTransport")} />
      )}

      {elevated && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-slate-900">
            {t("gettingStarted")}
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              "setupYear",
              "setupClass",
              "setupSubjects",
              "setupTeacher",
              "setupStudent",
            ].map((key, index) => (
              <li
                key={key}
                className="flex items-start gap-3 text-sm text-slate-600"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                  {index + 1}
                </span>
                {t(key)}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {t("dashboardDataNote")}
      </div>

      <HealthStatusWidget />
    </div>
  );
}

function UnavailableModuleCard({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
      <h2 className="font-medium text-slate-800">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {t("moduleUnavailableDescription")}
      </p>
    </section>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <Icon aria-hidden="true" className="h-5 w-5 text-indigo-600" />
      <span className="flex-1">{label}</span>
      <ArrowRight aria-hidden="true" className="h-4 w-4 text-slate-400" />
    </Link>
  );
}
