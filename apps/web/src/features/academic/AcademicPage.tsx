import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Permission } from "@schoolerp/contracts";
import { ApiCollection } from "../shared/ApiCollection";
import { useAuth } from "../auth/AuthContext";
import { fetchApi } from "../../lib/api-client";

type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
type AcademicYear = { id: string; code: string; name: string; status: string };

const YEAR_PATH = "/api/v1/academic/years";

export function AcademicPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("years");
  const canWrite =
    user?.permissions.includes(Permission.ACADEMIC_WRITE) ?? false;
  const tabs = [
    "years",
    "terms",
    "classLevels",
    "sections",
    "subjects",
    "curriculum",
    "teachingAssignments",
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-indigo-700">
          {t("academicSetup")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {t("academicSetup")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("academicSetupDescription")}
        </p>
      </header>

      <div
        className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-1"
        role="tablist"
        aria-label={t("academicSetup")}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-medium ${activeTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {activeTab === "years" && <AcademicYearsCollection canWrite={canWrite} />}
      {activeTab === "terms" && <TermsCollection canWrite={canWrite} />}
      {activeTab === "classLevels" && (
        <ApiCollection
          title={t("classLevels")}
          description={t("classLevelsDescription")}
          path="/api/v1/academic/class-levels"
          queryKey="academic-class-levels"
          canCreate={canWrite}
          canEdit={canWrite}
          displayFields={["code", "name", "sortOrder"]}
          fields={[
            { name: "code", label: "code", required: true },
            { name: "name", label: "name", required: true },
            {
              name: "sortOrder",
              label: "sortOrder",
              type: "number",
              required: true,
            },
            {
              name: "isActive",
              label: "isActive",
              type: "checkbox",
              defaultChecked: true,
            },
          ]}
        />
      )}
      {activeTab === "sections" && (
        <ApiCollection
          title={t("sections")}
          description={t("sectionIdHelp")}
          path="/api/v1/academic/sections"
          queryKey="academic-sections"
          canCreate={canWrite}
          canEdit={canWrite}
          displayFields={[
            "code",
            "name",
            "capacity",
            "academicYearId",
            "classLevelId",
          ]}
          fields={[
            {
              name: "academicYearId",
              label: "academicYear",
              type: "select",
              optionPath: YEAR_PATH,
              optionLabelFields: ["name", "code"],
              required: true,
            },
            {
              name: "classLevelId",
              label: "classLevel",
              type: "select",
              optionPath: "/api/v1/academic/class-levels",
              optionLabelFields: ["name", "code"],
              required: true,
            },
            { name: "code", label: "code", required: true },
            { name: "name", label: "name", required: true },
            {
              name: "capacity",
              label: "capacity",
              type: "number",
              optional: true,
            },
          ]}
        />
      )}
      {activeTab === "subjects" && (
        <ApiCollection
          title={t("subjects")}
          description={t("subjectsDescription")}
          path="/api/v1/academic/subjects"
          queryKey="academic-subjects"
          canCreate={canWrite}
          canEdit={canWrite}
          displayFields={["code", "name", "isActive"]}
          fields={[
            { name: "code", label: "code", required: true },
            { name: "name", label: "name", required: true },
            {
              name: "isActive",
              label: "isActive",
              type: "checkbox",
              defaultChecked: true,
            },
          ]}
        />
      )}
      {activeTab === "curriculum" && (
        <CurriculumCollection canWrite={canWrite} />
      )}
      {activeTab === "teachingAssignments" && (
        <TeachingAssignmentsCollection canWrite={canWrite} />
      )}
    </div>
  );
}

function AcademicYearsCollection({ canWrite }: { canWrite: boolean }) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState("");
  return (
    <ApiCollection
      title={t("academicYears")}
      description={t("academicYearDescription")}
      path={YEAR_PATH}
      queryKey="academic-years"
      canCreate={canWrite}
      canEdit={canWrite}
      displayFields={["code", "name", "status", "startsOn", "endsOn"]}
      fields={[
        { name: "code", label: "code", required: true },
        { name: "name", label: "name", required: true },
        { name: "startsOn", label: "startsOn", type: "date", required: true },
        { name: "endsOn", label: "endsOn", type: "date", required: true },
      ]}
      actions={(record, refresh) => {
        const year = record as AcademicYear;
        if (!canWrite || !year.id) return null;
        const changeStatus = async (action: "activate" | "close") => {
          if (action === "close" && !window.confirm(t("confirmCloseYear")))
            return;
          setConfirm(year.id);
          try {
            await fetchApi(`${YEAR_PATH}/${year.id}/${action}`, {
              method: "POST",
            });
            refresh();
          } catch {
            setConfirm("");
          }
          setConfirm("");
        };
        return (
          <div className="flex gap-2">
            {year.status === "PLANNED" && (
              <button
                type="button"
                disabled={confirm === year.id}
                onClick={() => void changeStatus("activate")}
                className="min-h-10 rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                {t("activate")}
              </button>
            )}
            {year.status === "ACTIVE" && (
              <button
                type="button"
                disabled={confirm === year.id}
                onClick={() => void changeStatus("close")}
                className="min-h-10 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
              >
                {t("closeYear")}
              </button>
            )}
          </div>
        );
      }}
    />
  );
}

function TermsCollection({ canWrite }: { canWrite: boolean }) {
  const { t } = useTranslation();
  const [yearId, setYearId] = useState("");
  const years = useQuery({
    queryKey: ["academic-years", YEAR_PATH],
    queryFn: () => fetchApi<PageResult<AcademicYear>>(YEAR_PATH),
  });
  return (
    <div className="space-y-4">
      <label className="block max-w-xl text-sm font-medium text-slate-700">
        {t("academicYear")}
        <select
          value={yearId}
          onChange={(event) => setYearId(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">{t("selectAcademicYear")}</option>
          {years.data?.items.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name} ({year.code})
            </option>
          ))}
        </select>
      </label>
      {yearId ? (
        <ApiCollection
          title={t("terms")}
          description={t("termDescription")}
          path="/api/v1/academic/terms"
          queryPath={`/api/v1/academic/terms?academicYearId=${encodeURIComponent(yearId)}`}
          queryKey="academic-terms"
          canCreate={canWrite}
          canEdit={canWrite}
          displayFields={["code", "name", "sequence", "startsOn", "endsOn"]}
          fields={[
            {
              name: "academicYearId",
              label: "academicYear",
              type: "select",
              optionPath: YEAR_PATH,
              optionLabelFields: ["name", "code"],
              required: true,
              defaultValue: yearId,
            },
            { name: "code", label: "code", required: true },
            { name: "name", label: "name", required: true },
            {
              name: "sequence",
              label: "sequence",
              type: "number",
              required: true,
            },
            {
              name: "startsOn",
              label: "startsOn",
              type: "date",
              required: true,
            },
            { name: "endsOn", label: "endsOn", type: "date", required: true },
          ]}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          {t("selectAcademicYear")}
        </p>
      )}
    </div>
  );
}

function CurriculumCollection({ canWrite }: { canWrite: boolean }) {
  const { t } = useTranslation();
  const [yearId, setYearId] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [teacherView, setTeacherView] = useState(false);
  const years = useQuery({
    queryKey: ["academic-years", YEAR_PATH],
    queryFn: () => fetchApi<PageResult<AcademicYear>>(YEAR_PATH),
  });
  const classLevels = useQuery({
    queryKey: ["academic-class-levels"],
    queryFn: () => fetchApi<PageResult<{ id: string; code: string; name: string }>>("/api/v1/academic/class-levels"),
  });
  const sections = useQuery({
    queryKey: ["academic-sections"],
    queryFn: () => fetchApi<PageResult<{ id: string; code: string; name: string; academicYearId: string; classLevelId: string }>>("/api/v1/academic/sections"),
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          {t("academicYear")}
          <select
            value={yearId}
            onChange={(event) => {
              setYearId(event.target.value);
              setClassLevelId("");
              setSectionId("");
            }}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="">{t("selectAcademicYear")}</option>
            {years.data?.items.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
        {t("classLevel")}
          <select
            value={classLevelId}
            onChange={(event) => {
              setClassLevelId(event.target.value);
              setSectionId("");
            }}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3"
          >
            <option value="">{t("selectOption")}</option>
            {classLevels.data?.items.map((level) => <option key={level.id} value={level.id}>{level.name} ({level.code})</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          {t("section")}
          <select
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3"
          >
            <option value="">{t("selectOption")}</option>
            {sections.data?.items.filter((section) => (!yearId || section.academicYearId === yearId) && (!classLevelId || section.classLevelId === classLevelId)).map((section) => <option key={section.id} value={section.id}>{section.name} ({section.code})</option>)}
          </select>
        </label>
      </div>
      <div className="flex gap-2" role="tablist" aria-label={t("curriculum")}>
        <button
          type="button"
          role="tab"
          aria-selected={!teacherView}
          onClick={() => setTeacherView(false)}
          className={`min-h-10 rounded-lg px-3 text-sm font-medium ${!teacherView ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          {t("curriculum")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={teacherView}
          onClick={() => setTeacherView(true)}
          className={`min-h-10 rounded-lg px-3 text-sm font-medium ${teacherView ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          {t("teachingAssignments")}
        </button>
      </div>
      {teacherView ? (
        <TeachingAssignmentsCollection canWrite={canWrite} />
      ) : (
        <div className="space-y-8">
          {yearId && classLevelId && (
            <ApiCollection
              title={t("curriculum")}
              description={t("curriculumDescription")}
              path={`/api/v1/academic/years/${encodeURIComponent(yearId)}/class-levels/${encodeURIComponent(classLevelId)}/subjects`}
              queryKey="academic-curriculum"
              canCreate={canWrite}
              displayFields={["subjectId", "isRequired", "sequence"]}
              fields={[
                {
                  name: "subjectId",
                  label: "subject",
                  type: "select",
                  optionPath: "/api/v1/academic/subjects",
                  optionLabelFields: ["name", "code"],
                  required: true,
                },
                {
                  name: "isRequired",
                  label: "required",
                  type: "checkbox",
                  defaultChecked: true,
                },
                { name: "sequence", label: "sequence", type: "number" },
              ]}
            />
          )}
          {sectionId && (
            <ApiCollection
              title={t("sectionSubjects")}
              description={t("sectionSubjectDescription")}
              path={`/api/v1/academic/sections/${encodeURIComponent(sectionId)}/subjects`}
              queryKey="academic-section-subjects"
              canCreate={canWrite}
              displayFields={["classSubjectId"]}
              fields={[
                {
                  name: "classSubjectId",
                  label: "subject",
                  type: "select",
                  optionPath: `/api/v1/academic/years/${encodeURIComponent(yearId)}/class-levels/${encodeURIComponent(classLevelId)}/subjects`,
                  optionLabelFields: ["subjectName", "subjectCode", "subjectId"],
                  required: true,
                },
              ]}
            />
          )}
          {(!yearId || !classLevelId || !sectionId) && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
              {t("curriculumIdHelp")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TeachingAssignmentsCollection({ canWrite }: { canWrite: boolean }) {
  const { t } = useTranslation();
  const [sectionId, setSectionId] = useState("");
  const [assignmentType, setAssignmentType] = useState<"subject" | "class">(
    "subject",
  );
  const sections = useQuery({
    queryKey: ["academic-sections"],
    queryFn: () => fetchApi<PageResult<{ id: string; code: string; name: string }>>("/api/v1/academic/sections"),
  });
  return (
    <div className="space-y-4">
      <div
        className="flex gap-2"
        role="tablist"
        aria-label={t("teachingAssignments")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={assignmentType === "subject"}
          onClick={() => setAssignmentType("subject")}
          className={`min-h-10 rounded-lg px-3 text-sm font-medium ${assignmentType === "subject" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          {t("subjectTeacher")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={assignmentType === "class"}
          onClick={() => setAssignmentType("class")}
          className={`min-h-10 rounded-lg px-3 text-sm font-medium ${assignmentType === "class" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          {t("classTeacher")}
        </button>
      </div>
      {assignmentType === "subject" ? (
        <>
        <label className="block max-w-xl text-sm font-medium text-slate-700">
          {t("section")}
          <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
            <option value="">{t("selectOption")}</option>
            {sections.data?.items.map((section) => <option key={section.id} value={section.id}>{section.name} ({section.code})</option>)}
          </select>
        </label>
        {sectionId && <ApiCollection
          title={t("subjectTeacher")}
          description={t("assignmentIdHelp")}
          path="/api/v1/academic/teacher-assignments"
          queryKey="teacher-assignments"
          canCreate={canWrite}
          displayFields={[
            "teacherUserId",
            "sectionSubjectId",
            "startsOn",
            "endsOn",
          ]}
          actions={(record, refresh) => (
            <EndAssignmentAction
              record={record}
              endpoint="/api/v1/academic/teacher-assignments"
              refresh={refresh}
              canWrite={canWrite}
            />
          )}
          fields={[
            {
              name: "sectionSubjectId",
              label: "subject",
              type: "select",
              optionPath: `/api/v1/academic/sections/${encodeURIComponent(sectionId)}/subjects`,
              optionLabelFields: ["classSubject.subject.name", "classSubject.subject.code"],
              required: true,
            },
            {
              name: "teacherUserId",
              label: "teacher",
              type: "select",
              optionPath: "/api/v1/auth/users",
              optionLabelFields: ["displayName", "email"],
              required: true,
            },
            {
              name: "startsOn",
              label: "startsOn",
              type: "date",
              required: true,
            },
            { name: "endsOn", label: "endsOn", type: "date", optional: true },
          ]}
        />}
        </>
      ) : (
        <ApiCollection
          title={t("classTeacher")}
          description={t("assignmentIdHelp")}
          path="/api/v1/academic/class-teacher-assignments"
          queryKey="class-teacher-assignments"
          canCreate={canWrite}
          displayFields={["teacherUserId", "sectionId", "startsOn", "endsOn"]}
          actions={(record, refresh) => (
            <EndAssignmentAction
              record={record}
              endpoint="/api/v1/academic/class-teacher-assignments"
              refresh={refresh}
              canWrite={canWrite}
            />
          )}
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
              name: "teacherUserId",
              label: "teacher",
              type: "select",
              optionPath: "/api/v1/auth/users",
              optionLabelFields: ["displayName", "email"],
              required: true,
            },
            {
              name: "startsOn",
              label: "startsOn",
              type: "date",
              required: true,
            },
            { name: "endsOn", label: "endsOn", type: "date", optional: true },
            { name: "reason", label: "reason", optional: true },
          ]}
        />
      )}
    </div>
  );
}

function EndAssignmentAction({
  record,
  endpoint,
  refresh,
  canWrite,
}: {
  record: Record<string, unknown>;
  endpoint: string;
  refresh: () => void;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (endsOn: string) =>
      fetchApi(
        `${endpoint}/${encodeURIComponent(String(record.id ?? ""))}/end`,
        {
          method: "PATCH",
          body: JSON.stringify({ endsOn }),
        },
      ),
    onSuccess: () => {
      setIsOpen(false);
      refresh();
    },
  });
  if (!canWrite || record.endsOn) return null;
  return isOpen ? (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const endsOn = String(data.get("endsOn") ?? "");
        if (endsOn) mutation.mutate(endsOn);
      }}
      className="flex items-center gap-2"
    >
      <label
        className="sr-only"
        htmlFor={`assignment-end-${String(record.id ?? "")}`}
      >
        {t("assignmentEndDate")}
      </label>
      <input
        id={`assignment-end-${String(record.id ?? "")}`}
        name="endsOn"
        type="date"
        required
        className="min-h-10 rounded-lg border border-slate-200 px-2 text-xs"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="min-h-10 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
      >
        {t("save")}
      </button>
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs"
      >
        {t("cancel")}
      </button>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="min-h-10 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-50"
    >
      {t("endAssignment")}
    </button>
  );
}

export function MyClassesPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">
          {t("navMyClasses")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("myClassesDescription")}
        </p>
      </header>
      <TeachingAssignmentsCollection canWrite={false} />
    </div>
  );
}
