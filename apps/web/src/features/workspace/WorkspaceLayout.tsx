import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BookOpen,
  Bus,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { locales, SupportedLanguage } from "@schoolerp/i18n";
import { useAuth } from "../auth/AuthContext";

type NavigationItem = {
  label: string;
  to?: string;
  icon: LucideIcon;
  permission?: string;
  roles?: string[];
  comingSoon?: boolean;
};

const navigation: NavigationItem[] = [
  { label: "navDashboard", to: "/", icon: LayoutDashboard },
  {
    label: "navAcademic",
    to: "/academic",
    icon: BookOpen,
    permission: "academic:read",
    roles: ["OWNER", "PRINCIPAL", "ADMIN", "ADMISSIONS_OFFICER"],
  },
  {
    label: "navMyClasses",
    to: "/my-classes",
    icon: CalendarDays,
    permission: "academic:read",
    roles: ["TEACHER"],
  },
  {
    label: "navStudents",
    to: "/students",
    icon: GraduationCap,
    permission: "student:read",
    roles: ["OWNER", "PRINCIPAL", "ADMIN", "ADMISSIONS_OFFICER", "TEACHER"],
  },
  {
    label: "navMyChildren",
    to: "/students",
    icon: Users,
    permission: "student:read",
    roles: ["PARENT"],
  },
  {
    label: "navMyRecord",
    to: "/students",
    icon: GraduationCap,
    permission: "student:read",
    roles: ["STUDENT"],
  },
  {
    label: "navStaffUsers",
    to: "/staff-users",
    icon: Users,
    permission: "user:manage",
    roles: ["OWNER", "PRINCIPAL", "ADMIN"],
  },
  {
    label: "navAdmissions",
    icon: ClipboardList,
    permission: "admission:read",
    comingSoon: true,
  },
  {
    label: "navFees",
    icon: Wallet,
    permission: "fee:read",
    comingSoon: true,
  },
  {
    label: "navAttendance",
    icon: Activity,
    permission: "attendance:read",
    comingSoon: true,
  },
  {
    label: "navTransport",
    icon: Bus,
    permission: "transport:read",
    comingSoon: true,
  },
  {
    label: "navHomework",
    icon: BookOpen,
    roles: ["TEACHER", "PARENT", "STUDENT"],
    comingSoon: true,
  },
  {
    label: "navReports",
    icon: ClipboardList,
    roles: ["OWNER", "PRINCIPAL", "ADMIN", "ACCOUNTANT"],
    comingSoon: true,
  },
];

export function WorkspaceLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;

  const roles = new Set(user.roles);
  const visibleNavigation = navigation.filter(
    (item) =>
      (!item.roles || item.roles.some((role) => roles.has(role))) &&
      (!item.permission || user.permissions.includes(item.permission)),
  );
  const roleLabel = user.roles.map((role) => t(`role_${role}`)).join(" · ");

  const sideNav = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
          S
        </div>
        <div>
          <p className="font-semibold text-slate-900">SchoolERP</p>
          <p className="text-xs text-slate-500">India</p>
        </div>
      </div>
      <nav aria-label={t("mainNavigation")} className="space-y-1 px-3 py-5">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          if (item.comingSoon) {
            return (
              <div
                key={item.label}
                title={t("moduleUnavailable")}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-400"
                aria-disabled="true"
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span className="flex-1">{t(item.label)}</span>
                <span className="text-[10px]">{t("comingSoon")}</span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.label}
              to={item.to ?? "/"}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {t(item.label)}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-200 p-4">
        <p className="truncate text-sm font-medium text-slate-800">
          {user.displayName}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{roleLabel}</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        {sideNav}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label={t("closeNavigation")}
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(20rem,85vw)] flex-col bg-white shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label={t("closeNavigation")}
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {sideNav}
          </aside>
        </div>
      )}

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label={t("openNavigation")}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-slate-700 sm:text-base">
              {t("appName")}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <label className="sr-only" htmlFor="workspace-language">
              {t("languageSwitcher")}
            </label>
            <select
              id="workspace-language"
              value={i18n.language.slice(0, 2)}
              onChange={(event) =>
                i18n.changeLanguage(event.target.value as SupportedLanguage)
              }
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="en">{t("english")}</option>
              <option value="hi">{locales.hi.hindi}</option>
              <option value="mr">{locales.mr.marathi}</option>
            </select>
            <button
              type="button"
              onClick={async () => {
                await logout().catch(() => undefined);
                navigate("/", { replace: true });
              }}
              className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {t("signOut")}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
