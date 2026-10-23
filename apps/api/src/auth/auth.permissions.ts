import { Permission, UserRole } from "@schoolerp/contracts";

// Initial M0 defaults; module owners must review and narrow these grants before
// their domain endpoints are added. Record-level scope checks remain mandatory.
const allSchoolPermissions = Object.values(Permission);

export const ROLE_PERMISSIONS: Readonly<
  Record<UserRole, readonly Permission[]>
> = {
  [UserRole.OWNER]: allSchoolPermissions,
  [UserRole.PRINCIPAL]: allSchoolPermissions,
  [UserRole.ADMIN]: allSchoolPermissions,
  [UserRole.ADMISSIONS_OFFICER]: [
    Permission.ADMISSION_READ,
    Permission.ADMISSION_WRITE,
    Permission.STUDENT_READ,
    Permission.STUDENT_WRITE,
  ],
  [UserRole.ACCOUNTANT]: [Permission.FEE_READ, Permission.FEE_WRITE],
  [UserRole.TEACHER]: [
    Permission.ACADEMIC_READ,
    Permission.STUDENT_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
  ],
  [UserRole.PARENT]: [
    Permission.STUDENT_READ,
    Permission.ATTENDANCE_READ,
    Permission.FEE_READ,
  ],
  [UserRole.STUDENT]: [Permission.ACADEMIC_READ, Permission.ATTENDANCE_READ],
  [UserRole.TRANSPORT_MANAGER]: [
    Permission.STUDENT_READ,
    Permission.TRANSPORT_READ,
    Permission.TRANSPORT_WRITE,
  ],
};

export function permissionsForRoles(roles: UserRole[]): Permission[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []))];
}
