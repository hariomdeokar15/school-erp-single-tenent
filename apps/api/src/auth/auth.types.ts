import { Permission, UserRole } from "@schoolerp/contracts";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  sessionId: string;
  mustChangePassword: boolean;
  roles: UserRole[];
  permissions: Permission[];
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: Omit<AuthenticatedUser, "sessionId">;
}
