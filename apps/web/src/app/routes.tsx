import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";
import { SignInPage } from "../features/auth/SignInPage";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { WorkspaceLayout } from "../features/workspace/WorkspaceLayout";
import { PermissionRoute } from "../features/workspace/PermissionRoute";
import { DashboardRouter } from "../features/dashboards/shared/DashboardRouter";
import { AcademicPage, MyClassesPage } from "../features/academic/AcademicPage";
import { StudentProfilePage } from "../features/students/StudentProfilePage";
import { StudentsPage } from "../features/students/StudentsPage";
import { StaffUsersPage } from "../features/staff/StaffUsersPage";

export function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<SignInRoute />} />
          <Route path="/change-password" element={<ChangePasswordRoute />} />
          <Route
            element={
              <RequireAuth>
                <WorkspaceLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardRouter />} />
            <Route
              path="academic"
              element={
                <PermissionRoute permission="academic:read">
                  <AcademicPage />
                </PermissionRoute>
              }
            />
            <Route
              path="my-classes"
              element={
                <PermissionRoute permission="academic:read">
                  <MyClassesPage />
                </PermissionRoute>
              }
            />
            <Route
              path="students"
              element={
                <PermissionRoute permission="student:read">
                  <StudentsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="students/:id"
              element={
                <PermissionRoute permission="student:read">
                  <StudentProfilePage />
                </PermissionRoute>
              }
            />
            <Route
              path="staff-users"
              element={
                <PermissionRoute permission="user:manage">
                  <StaffUsersPage />
                </PermissionRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function SignInRoute() {
  const { user } = useAuth();
  return user ? (
    <Navigate to={user.mustChangePassword ? "/change-password" : "/"} replace />
  ) : (
    <SignInPage />
  );
}

function ChangePasswordRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.mustChangePassword ? (
    <ChangePasswordPage />
  ) : (
    <Navigate to="/" replace />
  );
}
