import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";
import { Permission } from "@schoolerp/contracts";
import { AuthenticatedUser } from "./auth.types";

export const IS_PUBLIC_KEY = "auth:is-public";
export const IS_AUTHENTICATED_KEY = "auth:is-authenticated";
export const REQUIRED_PERMISSIONS_KEY = "auth:required-permissions";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED_KEY, true);
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
);
