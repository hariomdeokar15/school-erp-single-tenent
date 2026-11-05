import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchApi } from "../../lib/api-client";
import { useAuth } from "../auth/AuthContext";

type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
type AcademicYear = {
  id: string;
  code: string;
  name: string;
  startsOn: string;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
};
type Student = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: string;
};
type Section = {
  id: string;
  name: string;
  code: string;
  academicYearId: string;
  isActive: boolean;
};
type PromotionResult = {
  total: number;
  promoted: number;
  alreadyPromoted: number;
  failed: number;
  results: Array<{
    studentId: string;
    enrollmentId?: string;
    status: "PROMOTED" | "ALREADY_PROMOTED" | "FAILED";
    message?: string;
  }>;
};

export function StudentPromotionPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canPromote =
    user?.roles.some((role) =>
      ["OWNER", "PRINCIPAL", "ADMIN"].includes(role),
    ) ?? false;
  const [sourceYearId, setSourceYearId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [enrollmentDate, setEnrollmentDate] = useState("");
  const [sectionByStudent, setSectionByStudent] = useState<
    Record<string, string>
  >({});
  const [selectedNames, setSelectedNames] = useState<Record<string, string>>(
    {},
  );
  const [result, setResult] = useState<PromotionResult | null>(null);
  const [error, setError] = useState("");

  const years = useQuery({
    queryKey: ["promotion-academic-years"],
    enabled: canPromote,
    queryFn: () =>
      fetchApi<PageResult<AcademicYear>>(
        "/api/v1/academic/years?page=1&pageSize=100",
      ),
  });
  const sourceYear = years.data?.items.find((year) => year.id === sourceYearId);
  const targetYear = years.data?.items.find((year) => year.id === targetYearId);
  const students = useQuery({
    queryKey: ["promotion-source-students", sourceYearId, studentPage],
    enabled: Boolean(sourceYearId) && canPromote,
    queryFn: () =>
      fetchApi<PageResult<Student>>(
        `/api/v1/students?academicYearId=${encodeURIComponent(sourceYearId)}&page=${studentPage}&pageSize=100`,
      ),
  });
  const sections = useQuery({
    queryKey: ["promotion-target-sections", targetYearId],
    enabled: Boolean(targetYearId) && canPromote,
    queryFn: () =>
      fetchApi<PageResult<Section>>(
        `/api/v1/academic/sections?academicYearId=${encodeURIComponent(targetYearId)}&page=1&pageSize=100`,
      ),
  });
  const activeStudents = useMemo(
    () =>
      students.data?.items.filter((student) => student.status === "ACTIVE") ??
      [],
    [students.data],
  );
  const targetSections =
    sections.data?.items.filter((section) => section.isActive) ?? [];
  const targetOptions =
    years.data?.items.filter(
      (year) =>
        year.status !== "CLOSED" &&
        year.id !== sourceYearId &&
        (!sourceYear || year.startsOn > sourceYear.startsOn),
    ) ?? [];

  const promote = useMutation({
    mutationFn: () =>
      fetchApi<PromotionResult>("/api/v1/students/promotions", {
        method: "POST",
        body: JSON.stringify({
          sourceAcademicYearId: sourceYearId,
          targetAcademicYearId: targetYearId,
          enrollmentDate,
          students: Object.entries(sectionByStudent).map(
            ([studentId, sectionId]) => ({ studentId, sectionId }),
          ),
        }),
      }),
    onSuccess: async (response) => {
      setResult(response);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({
        queryKey: ["student-enrollments"],
      });
    },
    onError: () => setError(t("requestFailed")),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    const count = Object.keys(sectionByStudent).length;
    if (!count) {
      setError(t("selectStudentsForPromotion"));
      return;
    }
    if (count > 100) {
      setError(t("promotionBatchLimit"));
      return;
    }
    promote.mutate();
  }

  function toggleStudent(student: Student, checked: boolean) {
    setSectionByStudent((current) => {
      const updated = { ...current };
      if (checked && targetSections[0]) {
        updated[student.id] = targetSections[0].id;
        setSelectedNames((names) => ({
          ...names,
          [student.id]: `${student.firstName} ${student.lastName}`,
        }));
      } else delete updated[student.id];
      return updated;
    });
    setResult(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/students"
        className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
      >
        {t("navStudents")}
      </Link>
      <header>
        <p className="text-sm font-medium text-indigo-700">{t("students")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {t("promoteStudents")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("promotionDescription")}
        </p>
      </header>

      {!canPromote ? (
        <p
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          {t("accessUnavailable")}
        </p>
      ) : years.isError ? (
        <ErrorNotice
          message={t("requestFailed")}
          onRetry={() => void years.refetch()}
        />
      ) : years.isLoading ? (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500"
        >
          {t("loading")}
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              {t("sourceAcademicYear")}
              <select
                value={sourceYearId}
                required
                onChange={(event) => {
                  setSourceYearId(event.target.value);
                  setTargetYearId("");
                  setEnrollmentDate("");
                  setStudentPage(1);
                  setSectionByStudent({});
                  setSelectedNames({});
                  setResult(null);
                }}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              >
                <option value="">{t("selectOption")}</option>
                {years.data?.items
                  .filter((year) => year.status === "CLOSED")
                  .map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.code})
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t("targetAcademicYear")}
              <select
                value={targetYearId}
                required
                disabled={!sourceYearId}
                onChange={(event) => {
                  const year = targetOptions.find(
                    (item) => item.id === event.target.value,
                  );
                  setTargetYearId(event.target.value);
                  setEnrollmentDate(year?.startsOn ?? "");
                  setSectionByStudent({});
                  setSelectedNames({});
                  setResult(null);
                }}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 disabled:bg-slate-50"
              >
                <option value="">{t("selectOption")}</option>
                {targetOptions.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} ({year.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t("enrollmentDate")}
              <input
                type="date"
                required
                value={enrollmentDate}
                onChange={(event) => setEnrollmentDate(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3"
              />
            </label>
          </div>

          {sourceYearId && students.isLoading && (
            <p role="status" className="text-sm text-slate-500">
              {t("loading")}
            </p>
          )}
          {sourceYearId && students.isError && (
            <ErrorNotice
              message={t("requestFailed")}
              onRetry={() => void students.refetch()}
            />
          )}
          {targetYearId && sections.isError && (
            <ErrorNotice
              message={t("requestFailed")}
              onRetry={() => void sections.refetch()}
            />
          )}
          {targetYearId && sections.isLoading && (
            <p role="status" className="text-sm text-slate-500">
              {t("loading")}
            </p>
          )}

          {sourceYearId &&
            targetYearId &&
            !students.isLoading &&
            !students.isError &&
            !sections.isLoading &&
            !sections.isError &&
            (targetSections.length && activeStudents.length ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                  <span>
                    {t("selectedStudentCount", {
                      count: Object.keys(sectionByStudent).length,
                    })}{" "}
                    · {t("recordsCount", { count: students.data?.total ?? 0 })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={studentPage <= 1}
                      onClick={() =>
                        setStudentPage((page) => Math.max(1, page - 1))
                      }
                      className="min-h-9 rounded-lg border border-slate-300 px-3 disabled:opacity-50"
                    >
                      {t("previous")}
                    </button>
                    <button
                      type="button"
                      disabled={
                        studentPage * 100 >= (students.data?.total ?? 0)
                      }
                      onClick={() => setStudentPage((page) => page + 1)}
                      className="min-h-9 rounded-lg border border-slate-300 px-3 disabled:opacity-50"
                    >
                      {t("next")}
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[auto_1fr_minmax(12rem,0.8fr)] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span className="sr-only">
                      {t("selectStudentsForPromotion")}
                    </span>
                    <span>{t("studentName")}</span>
                    <span>{t("targetSection")}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {activeStudents.map((student) => {
                      const selected = Boolean(sectionByStudent[student.id]);
                      return (
                        <div
                          key={student.id}
                          className="grid grid-cols-[auto_1fr_minmax(12rem,0.8fr)] items-center gap-3 px-4 py-3"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            aria-label={`${student.firstName} ${student.lastName}`}
                            onChange={(event) =>
                              toggleStudent(student, event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {student.studentNumber}
                            </span>
                          </span>
                          <select
                            value={sectionByStudent[student.id] ?? ""}
                            disabled={!selected}
                            onChange={(event) => {
                              setSectionByStudent((current) => ({
                                ...current,
                                [student.id]: event.target.value,
                              }));
                              setResult(null);
                            }}
                            className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-50"
                          >
                            <option value="">{t("selectOption")}</option>
                            {targetSections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.name} ({section.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                {targetSections.length
                  ? t("noStudents")
                  : t("noTargetSections")}
              </p>
            ))}

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={
              promote.isPending ||
              !Object.keys(sectionByStudent).length ||
              Object.keys(sectionByStudent).length > 100 ||
              !targetYear
            }
            className="min-h-11 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {promote.isPending ? t("saving") : t("promoteSelected")}
          </button>
        </form>
      )}

      {result && (
        <section
          aria-live="polite"
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold text-slate-900">
            {t("promotionResults")}
          </h2>
          <p className="text-sm text-slate-600">
            {t("promotionSummary", {
              promoted: result.promoted,
              alreadyPromoted: result.alreadyPromoted,
              failed: result.failed,
            })}
          </p>
          {result.failed > 0 && (
            <p className="text-xs text-slate-500">{t("promotionCanRetry")}</p>
          )}
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {result.results.map((item, index) => (
              <li
                key={`${item.studentId}-${index}`}
                className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>{selectedNames[item.studentId] ?? item.studentId}</span>
                <span
                  className={
                    item.status === "FAILED"
                      ? "text-red-700"
                      : "text-emerald-700"
                  }
                >
                  {item.status === "FAILED"
                    ? item.message
                    : t(
                        item.status === "PROMOTED"
                          ? "promoted"
                          : "alreadyPromoted",
                      )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
      <p role="alert" className="text-sm text-red-700">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-9 rounded-lg border border-red-200 bg-white px-3 text-sm"
      >
        {t("retry")}
      </button>
    </div>
  );
}
