import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { RoleDashboard } from "./RoleDashboard";
import { OwnerDashboard } from "../owner/OwnerDashboard";
import { PrincipalDashboard } from "../principal/PrincipalDashboard";
import { AdminDashboard } from "../admin/AdminDashboard";
import { TeacherDashboard } from "../teacher/TeacherDashboard";
import { ParentDashboard } from "../parent/ParentDashboard";
import { StudentDashboard } from "../student/StudentDashboard";
import { AdmissionsDashboard } from "../staff/AdmissionsDashboard";
import { AccountantDashboard } from "../staff/AccountantDashboard";
import { TransportDashboard } from "../staff/TransportDashboard";

const dashboards: Record<string, () => JSX.Element> = {
  OWNER: OwnerDashboard,
  PRINCIPAL: PrincipalDashboard,
  ADMIN: AdminDashboard,
  TEACHER: TeacherDashboard,
  PARENT: ParentDashboard,
  STUDENT: StudentDashboard,
  ADMISSIONS_OFFICER: AdmissionsDashboard,
  ACCOUNTANT: AccountantDashboard,
  TRANSPORT_MANAGER: TransportDashboard,
};

export function DashboardRouter() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  if (roles.length > 1) return <RoleDashboard roles={roles} />;
  const Dashboard = dashboards[roles[0]];
  return Dashboard ? <Dashboard /> : <Navigate to="/login" replace />;
}
