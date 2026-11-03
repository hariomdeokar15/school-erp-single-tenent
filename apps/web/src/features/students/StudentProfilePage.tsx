import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Permission } from "@schoolerp/contracts";
import { fetchApi } from "../../lib/api-client";
import { useAuth } from "../auth/AuthContext";

type Student = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  dateOfBirth?: string | null;
};
export function StudentProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite =
    user?.permissions.includes(Permission.STUDENT_WRITE) ?? false;
  const profile = useQuery({
    queryKey: ["student", id],
    queryFn: () =>
      fetchApi<Student>(`/api/v1/students/${encodeURIComponent(id ?? "")}`),
    enabled: Boolean(id),
  });
  const enrollments = useQuery({
    queryKey: ["student-enrollments", id],
    queryFn: () =>
      fetchApi<Record<string, unknown>[]>(
        `/api/v1/students/${encodeURIComponent(id ?? "")}/enrollments`,
      ),
    enabled: Boolean(id),
  });

  if (profile.isLoading) return <LoadingBlock />;
  if (profile.isError || !profile.data) return <ErrorBlock />;
  const student = profile.data;

  return (
    <div className="space-y-6">
      <Link
        to="/students"
        className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
      >
        ← {t("navStudents")}
      </Link>
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              {student.studentNumber}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              {student.firstName} {student.lastName}
            </h1>
            <p className="mt-2">
              <StatusBadge status={student.status} />
            </p>
          </div>
          {student.dateOfBirth && (
            <div className="text-sm text-slate-500">
              {t("dateOfBirth")}: {student.dateOfBirth}
            </div>
          )}
        </div>
      </header>

      {canWrite && id && (
        <div className="grid gap-4 xl:grid-cols-2">
          <ActionForm
            title={t("updateStudent")}
            path={`/api/v1/students/${encodeURIComponent(id)}`}
            method="PATCH"
            fields={[
              {
                name: "firstName",
                label: "firstName",
                required: true,
                defaultValue: student.firstName,
              },
              {
                name: "lastName",
                label: "lastName",
                required: true,
                defaultValue: student.lastName,
              },
              {
                name: "dateOfBirth",
                label: "dateOfBirth",
                type: "date",
                defaultValue: student.dateOfBirth ?? "",
              },
            ]}
            invalidate={[["student", id], ["students"]]}
          />
          <ActionForm
            title={t("enrollStudent")}
            path={`/api/v1/students/${encodeURIComponent(id)}/enrollments`}
            method="POST"
            fields={[
              {
                name: "academicYearId",
                label: "academicYear",
                type: "select",
                optionPath: "/api/v1/academic/years",
                optionLabelFields: ["name", "code"],
                required: true,
              },
              {
                name: "sectionId",
                label: "section",
                type: "select",
                optionPath: "/api/v1/academic/sections",
                optionLabelFields: ["name", "code"],
                dependsOn: "academicYearId",
                required: true,
              },
              {
                name: "enrollmentDate",
                label: "enrollmentDate",
                type: "date",
                required: true,
              },
            ]}
            invalidate={[["student-enrollments", id], ["students"]]}
          />
          <ActionForm
            title={t("createGuardian")}
            path={`/api/v1/students/${encodeURIComponent(id)}/guardians`}
            method="POST"
            fields={[
              { name: "firstName", label: "firstName", required: true },
              { name: "lastName", label: "lastName", required: true },
              { name: "relationship", label: "relationship", required: true },
              { name: "email", label: "email", type: "email" },
              { name: "phone", label: "phone", type: "tel" },
            ]}
            invalidate={[["student-guardians", id]]}
          />
          <ActionForm
            title={t("linkAccount")}
            path={`/api/v1/students/${encodeURIComponent(id)}/link-account`}
            method="PATCH"
            fields={[{
              name: "userId",
              label: "user",
              type: "select",
              optionPath: "/api/v1/auth/users",
              optionLabelFields: ["displayName", "email"],
              required: true,
            }]}
            invalidate={[["student", id]]}
          />
        </div>
      )}

      {canWrite && id && <StudentGuardians studentId={id} />}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {t("enrollmentHistory")}
        </h2>
        {enrollments.isLoading ? (
          <LoadingBlock />
        ) : enrollments.isError ? (
          <ErrorBlock />
        ) : enrollments.data?.length ? (
          <div className="space-y-3">
            {enrollments.data.map((enrollment, index) => (
              <EnrollmentCard
                key={String(enrollment.id ?? index)}
                enrollment={enrollment}
                studentId={id ?? ""}
                canWrite={canWrite}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            {t("noEnrollments")}
          </p>
        )}
      </section>
    </div>
  );
}

function StudentGuardians({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const guardians = useQuery({
    queryKey: ["student-guardians", studentId],
    queryFn: () =>
      fetchApi<Record<string, unknown>[]>(
        `/api/v1/students/${encodeURIComponent(studentId)}/guardians`,
      ),
  });
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{t("guardians")}</h2>
      {guardians.isLoading ? (
        <LoadingBlock />
      ) : guardians.isError ? (
        <ErrorBlock />
      ) : guardians.data?.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {guardians.data.map((item, index) => (
            <article
              key={String(item.id ?? index)}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="font-medium text-slate-900">
                {String(item.firstName ?? "")} {String(item.lastName ?? "")}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {String(item.relationship ?? "")}
              </p>
              {typeof item.email === "string" && item.email.length > 0 && (
                <p className="mt-2 text-sm text-slate-600">{item.email}</p>
              )}
              {typeof item.phone === "string" && item.phone.length > 0 && (
                <p className="text-sm text-slate-600">{item.phone}</p>
              )}
              {!item.hasPortalAccount && (
                <details className="mt-3 border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-indigo-700">
                    {t("linkAccount")}
                  </summary>
                  <ActionForm
                    title={t("linkAccount")}
                    path={`/api/v1/guardians/${encodeURIComponent(String(item.id ?? ""))}/link-account`}
                    method="PATCH"
                    fields={[
                      {
                        name: "userId",
                        label: "user",
                        type: "select",
                        optionPath: "/api/v1/auth/users",
                        optionLabelFields: ["displayName", "email"],
                        required: true,
                      },
                    ]}
                    invalidate={[["student-guardians", studentId]]}
                  />
                </details>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          {t("noRecords")}
        </p>
      )}
    </section>
  );
}

type ActionField = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  optionPath?: string;
  optionLabelFields?: string[];
  dependsOn?: string;
};
function ActionForm({
  title,
  path,
  method,
  fields,
  invalidate,
  confirmBeforeSubmit = false,
}: {
  title: string;
  path: string;
  method: "POST" | "PATCH";
  fields: ActionField[];
  invalidate: readonly (readonly unknown[])[];
  confirmBeforeSubmit?: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const optionPaths = [...new Set(fields.map((field) => field.optionPath).filter((value): value is string => Boolean(value)))];
  const optionQueries = useQueries({
    queries: optionPaths.map((optionPath) => ({
      queryKey: ["student-action-options", optionPath],
      queryFn: () => fetchApi<{ items: Record<string, unknown>[] } | Record<string, unknown>[]>(`${optionPath}${optionPath.includes("?") ? "&" : "?"}page=1&pageSize=100`),
      staleTime: 60_000,
    })),
  });
  const optionsByPath = new Map(optionPaths.map((optionPath, index) => {
    const data = optionQueries[index]?.data;
    return [optionPath, Array.isArray(data) ? data : data?.items ?? []];
  }));
  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchApi(path, { method, body: JSON.stringify(payload) }),
    onSuccess: async () => {
      setMessage(t("successSaved"));
      await Promise.all(
        invalidate.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
    onError: () => setMessage(t("requestFailed")),
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (confirmBeforeSubmit && !window.confirm(t("confirmCloseEnrollment")))
          return;
        const data = new FormData(event.currentTarget);
        const payload: Record<string, unknown> = {};
        fields.forEach((field) => {
          const value = String(data.get(field.name) ?? "").trim();
          if (value) payload[field.name] = value;
          else if (field.required) setMessage(t("requiredField"));
        });
        if (
          fields.some(
            (field) =>
              field.required && !String(data.get(field.name) ?? "").trim(),
          )
        )
          return;
        mutation.mutate(payload);
      }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 font-semibold text-slate-900">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <Field
            key={field.name}
            name={field.name}
            label={t(field.label)}
            type={field.type}
            required={field.required}
            defaultValue={field.defaultValue}
            options={getActionFieldOptions(field, optionsByPath, selectedValues)}
            value={selectedValues[field.name] ?? field.defaultValue ?? ""}
            disabled={Boolean(field.dependsOn && !selectedValues[field.dependsOn])}
            onChange={(value) => setSelectedValues((current) => {
              const updated = { ...current, [field.name]: value };
              fields.filter((dependent) => dependent.dependsOn === field.name).forEach((dependent) => {
                updated[dependent.name] = "";
              });
              return updated;
            })}
          />
        ))}
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-4 min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {mutation.isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  options,
  value,
  disabled = false,
  onChange,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  value?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {type === "select" ? (
        <select
          name={name}
          required={required}
          value={value ?? defaultValue ?? ""}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">{t("selectOption")}</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      )}
    </label>
  );
}

function getActionFieldOptions(
  field: ActionField,
  optionsByPath: Map<string, Record<string, unknown>[]>,
  selectedValues: Record<string, string>,
): { value: string; label: string }[] {
  if (field.options) return field.options;
  if (!field.optionPath) return [];
  const dependency = field.dependsOn ? selectedValues[field.dependsOn] : undefined;
  return (optionsByPath.get(field.optionPath) ?? [])
    .filter((item) => !field.dependsOn || (Boolean(dependency) && item.academicYearId === dependency))
    .map((item) => {
      const label = (field.optionLabelFields ?? ["name", "code", "email"])
        .map((key) => key.split(".").reduce<unknown>((current, part) => {
          if (typeof current !== "object" || current === null) return undefined;
          return (current as Record<string, unknown>)[part];
        }, item))
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        .join(" · ");
      return { value: String(item.id ?? ""), label: label || String(item.id ?? "") };
    })
    .filter((option) => option.value.length > 0);
}

function EnrollmentCard({
  enrollment,
  studentId,
  canWrite,
}: {
  enrollment: Record<string, unknown>;
  studentId: string;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const enrollmentId = String(enrollment.id ?? "");
  const placements = Array.isArray(enrollment.placements)
    ? enrollment.placements.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
    : [];
  const currentPlacement = placements.find(
    (placement) => placement.endsOn === null,
  );
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">
            {t("enrollment")} · {String(enrollment.status ?? "")}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {String(enrollment.enrollmentDate ?? "")}
          </p>
          {currentPlacement && (
            <p className="mt-1 text-sm text-slate-600">
              {t("currentPlacement")}:{" "}
              {String(currentPlacement.sectionId ?? "")}
            </p>
          )}
          <p className="mt-1 font-mono text-[11px] text-slate-400">
            {enrollmentId}
          </p>
        </div>
        {canWrite && enrollment.status === "ENROLLED" && enrollmentId && (
          <details>
            <summary className="min-h-10 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              {t("manageEnrollment")}
            </summary>
            <div className="mt-3 grid w-[min(38rem,80vw)] gap-3 sm:grid-cols-2">
              <ActionForm
                title={t("transferSection")}
                path={`/api/v1/enrollments/${encodeURIComponent(enrollmentId)}/placements`}
                method="POST"
                fields={[
                  {
                    name: "sectionId",
                    label: "section",
                    type: "select",
                    optionPath: "/api/v1/academic/sections",
                    optionLabelFields: ["name", "code"],
                    required: true,
                  },
                  {
                    name: "startsOn",
                    label: "startsOn",
                    type: "date",
                    required: true,
                  },
                  { name: "reason", label: "reason" },
                ]}
                invalidate={[["student-enrollments", studentId], ["students"]]}
              />
              <ActionForm
                title={t("closeEnrollment")}
                path={`/api/v1/enrollments/${encodeURIComponent(enrollmentId)}/close`}
                method="POST"
                confirmBeforeSubmit
                fields={[
                  {
                    name: "status",
                    label: "closeStatus",
                    type: "select",
                    required: true,
                    options: ["COMPLETED", "WITHDRAWN", "TRANSFERRED"].map(
                      (value) => ({
                        value,
                        label:
                          t(value.toLowerCase()) === value.toLowerCase()
                            ? value
                            : t(value.toLowerCase()),
                      }),
                    ),
                  },
                  {
                    name: "exitDate",
                    label: "exitDate",
                    type: "date",
                    required: true,
                  },
                ]}
                invalidate={[["student-enrollments", studentId], ["students"]]}
              />
            </div>
          </details>
        )}
      </div>
      {placements.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("currentPlacement")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {placements.map((placement, index) => (
              <li key={String(placement.id ?? index)}>
                {String(placement.startsOn ?? "")} —{" "}
                {placement.endsOn === null
                  ? t("active")
                  : String(placement.endsOn)}{" "}
                · {String(placement.sectionId ?? "")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
    >
      {t(status.toLowerCase()) === status.toLowerCase()
        ? status
        : t(status.toLowerCase())}
    </span>
  );
}

function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <p
      className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500"
      role="status"
    >
      {t("loading")}
    </p>
  );
}

function ErrorBlock() {
  const { t } = useTranslation();
  return (
    <p
      className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700"
      role="alert"
    >
      {t("requestFailed")}
    </p>
  );
}
