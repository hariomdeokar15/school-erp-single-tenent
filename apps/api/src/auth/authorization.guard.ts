import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission } from "@schoolerp/contracts";
import {
  IS_AUTHENTICATED_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from "./auth.decorators";
import { AuthenticatedUser } from "./auth.types";
import { Request } from "express";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets))
      return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      targets,
    );
    const authenticatedRoute = this.reflector.getAllAndOverride<boolean>(
      IS_AUTHENTICATED_KEY,
      targets,
    );
    if (!required && !authenticatedRoute) {
      throw new ForbiddenException("Route has no declared access policy.");
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    if (!request.user) {
      throw new UnauthorizedException("Authentication is required.");
    }
    if (
      request.user.mustChangePassword &&
      request.url.split("?")[0] !== "/api/v1/auth/change-password"
    ) {
      throw new ForbiddenException(
        "Change the temporary password before continuing.",
      );
    }
    if (
      required?.some(
        (permission) => !request.user.permissions.includes(permission),
      )
    ) {
      throw new ForbiddenException(
        "You do not have permission to perform this action.",
      );
    }
    return true;
  }
}
