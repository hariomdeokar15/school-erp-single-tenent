import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Plus, RotateCw, X } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

type ApiRecord = Record<string, unknown> & { id?: string };
type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
type CollectionData = {
  items: ApiRecord[];
  page: number;
  pageSize: number;
  total: number;
};
type FieldDefinition = {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "email" | "tel" | "checkbox" | "select";
  required?: boolean;
  optional?: boolean;
  defaultChecked?: boolean;
  defaultValue?: string;
  optionPath?: string;
  optionLabelFields?: string[];
};

type ApiCollectionProps = {
  title: string;
  description: string;
  path: string;
  queryPath?: string;
  queryKey: string;
  fields?: FieldDefinition[];
  displayFields: string[];
  canCreate?: boolean;
  canEdit?: boolean;
  actions?: (record: ApiRecord, refresh: () => void) => ReactNode;
};

function withPagination(path: string, page: number, pageSize = 25): string {
  const [resource, search = ""] = path.split("?", 2);
  const params = new URLSearchParams(search);
  params.set("page", String(page));
  if (!params.has("pageSize")) params.set("pageSize", String(pageSize));
  return `${resource}?${params.toString()}`;
}

function getDisplayValue(record: ApiRecord, field: string): string {
  const value = record[field];
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return "";
  return String(value);
}

export function ApiCollection({
  title,
  description,
  path,
  queryPath,
  queryKey,
  fields = [],
  displayFields,
  canCreate = false,
  canEdit = false,
  actions,
}: ApiCollectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ApiRecord | null>(null);
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState("");
  const listPath = queryPath ?? path;
  const optionPaths = [...new Set(fields.map((field) => field.optionPath).filter((value): value is string => Boolean(value)))];
  const optionQueries = useQueries({
    queries: optionPaths.map((optionPath) => ({
      queryKey: ["academic-field-options", optionPath],
      queryFn: () => fetchApi<PageResult<ApiRecord> | ApiRecord[]>(withPagination(optionPath, 1, 100)),
      staleTime: 60_000,
    })),
  });
  const optionsByPath = new Map(
    optionPaths.map((optionPath, index) => {
      const data = optionQueries[index]?.data;
      return [optionPath, Array.isArray(data) ? data : (data?.items ?? [])];
    }),
  );
  useEffect(() => setPage(1), [listPath]);
  const collectionQuery = useQuery({
    queryKey: [queryKey, listPath, page],
    queryFn: async () => {
      const response = await fetchApi<PageResult<ApiRecord> | ApiRecord[]>(
        withPagination(listPath, page),
      );
      if (Array.isArray(response)) {
        const pageSize = 25;
        return {
          items: response.slice((page - 1) * pageSize, page * pageSize),
          page,
          pageSize,
          total: response.length,
        } satisfies CollectionData;
      }
      return response;
    },
  });
  const saveMutation = useMutation({
    mutationFn: ({
      payload,
      recordId,
    }: {
      payload: Record<string, unknown>;
      recordId?: string;
    }) =>
      fetchApi(recordId ? `${path}/${encodeURIComponent(recordId)}` : path, {
        method: recordId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      setShowForm(false);
      setEditingRecord(null);
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: () => setFormError(t("requestFailed")),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const value = form.get(field.name);
      if (field.type === "checkbox") {
        payload[field.name] = value === "on";
      } else if (typeof value === "string" && value.length > 0) {
        payload[field.name] = field.type === "number" ? Number(value) : value;
      } else if (field.required) {
        setFormError(t("requiredField"));
        return;
      }
    }
    saveMutation.mutate({ payload, recordId: editingRecord?.id });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void collectionQuery.refetch()}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            {t("refresh")}
          </button>
          {canCreate && fields.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setShowForm((open) => !open);
                setFormError("");
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {showForm ? (
                <X aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Plus aria-hidden="true" className="h-4 w-4" />
              )}
              {showForm ? t("cancel") : t("create")}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form
          key={editingRecord?.id ?? "new-record"}
          onSubmit={submit}
          className="grid gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {fields.map((field) => (
            <label
              key={field.name}
              className={`block text-sm font-medium text-slate-700 ${field.type === "checkbox" ? "flex items-center gap-3" : ""}`}
            >
              {field.type === "checkbox" ? (
                <>
                  <input
                    type="checkbox"
                    name={field.name}
                    defaultChecked={
                      editingRecord
                        ? Boolean(editingRecord[field.name])
                        : field.defaultChecked
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {t(field.label)}
                </>
              ) : field.type === "select" ? (
                <>
                  {t(field.label)}
                  <select
                    name={field.name}
                    required={field.required}
                    defaultValue={editingRecord ? String(editingRecord[field.name] ?? "") : field.defaultValue ?? ""}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">{t("selectOption")}</option>
                    {(optionsByPath.get(field.optionPath ?? "") ?? []).map((option) => {
                      const value = String(option.id ?? option.value ?? "");
                      const label = (field.optionLabelFields ?? ["name", "code", "email"])
                        .map((key) => key.split(".").reduce<unknown>((current, part) => {
                          if (typeof current !== "object" || current === null) return undefined;
                          return (current as Record<string, unknown>)[part];
                        }, option))
                        .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
                        .join(" · ") || String(option.label ?? value);
                      return <option key={value} value={value}>{label}</option>;
                    })}
                  </select>
                </>
              ) : (
                <>
                  {t(field.label)}
                  <input
                    type={field.type ?? "text"}
                    name={field.name}
                    required={field.required}
                    defaultValue={
                      editingRecord
                        ? String(editingRecord[field.name] ?? "")
                        : field.defaultValue
                    }
                    min={field.type === "number" ? 0 : undefined}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </>
              )}
            </label>
          ))}
          {formError && (
            <p
              role="alert"
              className="text-sm text-red-700 sm:col-span-2 lg:col-span-3"
            >
              {formError}
            </p>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="min-h-11 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {saveMutation.isPending ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {collectionQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500" role="status">
            {t("loading")}
          </div>
        ) : collectionQuery.isError ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p role="alert" className="text-sm text-red-700">
              {t("requestFailed")}
            </p>
            <button
              type="button"
              onClick={() => void collectionQuery.refetch()}
              className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("retry")}
            </button>
          </div>
        ) : collectionQuery.data?.items.length ? (
          <>
            <div className="divide-y divide-slate-100">
              {collectionQuery.data.items.map((record, index) => (
                <article
                  key={record.id ?? `${queryKey}-${index}`}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {displayFields
                        .map((field) => getDisplayValue(record, field))
                        .filter((value) => value !== "—")
                        .join(" · ") ||
                        record.id ||
                        t("noRecords")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit && record.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRecord(record);
                          setShowForm(true);
                          setFormError("");
                        }}
                        className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {t("edit")}
                      </button>
                    )}
                    {actions?.(
                      record,
                      () =>
                        void queryClient.invalidateQueries({
                          queryKey: [queryKey],
                        }),
                    )}
                  </div>
                </article>
              ))}
            </div>
            {collectionQuery.data.total > collectionQuery.data.pageSize && (
              <nav
                className="flex flex-col justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-5"
                aria-label={t("pagination")}
              >
                <span>
                  {collectionQuery.data.total} {t("records")}
                </span>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span>
                    {t("pageOf", {
                      page: collectionQuery.data.page,
                      pages: Math.ceil(
                        collectionQuery.data.total /
                          collectionQuery.data.pageSize,
                      ),
                    })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
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
                        page * collectionQuery.data.pageSize >=
                        collectionQuery.data.total
                      }
                      onClick={() => setPage((current) => current + 1)}
                      className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
                    >
                      {t("next")}
                    </button>
                  </div>
                </div>
              </nav>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            {t("noRecords")}
          </div>
        )}
      </div>
    </section>
  );
}
