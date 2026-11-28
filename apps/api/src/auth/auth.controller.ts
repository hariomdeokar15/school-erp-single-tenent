import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Permission } from "@schoolerp/contracts";
import { Request } from "express";
import {
  Authenticated,
  CurrentUser,
  Public,
  RequirePermissions,
} from "./auth.decorators";
import { AuthService } from "./auth.service";
import { AuthenticatedUser } from "./auth.types";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { ListUsersDto } from "./dto/list-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { BeginEmailVerificationDto } from "./dto/begin-email-verification.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { SupportedLanguage } from "@schoolerp/i18n";

function requestLanguage(request: Request): SupportedLanguage {
  const accepted = request.get("accept-language")?.toLowerCase() || "en";
  for (const language of accepted
    .split(",")
    .map((part) => part.split(";")[0].trim().split("-")[0])) {
    if (language === "mr" || language === "hi") return language;
    if (language === "en") return "en";
  }
  return "en";
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() input: LoginDto, @Req() request: Request) {
    return this.auth.login(
      input.email,
      input.password,
      request.ip || "unknown",
      request.get("user-agent"),
    );
  }

  @Public()
  @Post("refresh")
  refresh(@Body() input: RefreshDto, @Req() request: Request) {
    return this.auth.refresh(
      input.refreshToken,
      request.ip || "unknown",
      request.get("user-agent"),
    );
  }

  @Public()
  @Post("forgot-password")
  forgotPassword(@Body() input: ForgotPasswordDto, @Req() request: Request) {
    return this.auth.forgotPassword(
      input.email,
      request.ip || "unknown",
      requestLanguage(request),
    );
  }

  @Public()
  @Post("reset-password")
  resetPassword(@Body() input: ResetPasswordDto, @Req() request: Request) {
    return this.auth.resetPassword(
      input.token,
      input.newPassword,
      request.ip || "unknown",
      requestLanguage(request),
    );
  }

  @Authenticated()
  @ApiBearerAuth()
  @Post("recovery-email/verification")
  beginEmailVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BeginEmailVerificationDto,
    @Req() request: Request,
  ) {
    return this.auth.beginEmailVerification(
      user,
      input.currentPassword,
      request.ip || "unknown",
      requestLanguage(request),
    );
  }

  @Public()
  @Post("verify-email")
  verifyEmail(@Body() input: VerifyEmailDto, @Req() request: Request) {
    return this.auth.verifyEmail(
      input.token,
      request.ip || "unknown",
      requestLanguage(request),
    );
  }

  @Authenticated()
  @ApiBearerAuth()
  @Get("me")
  currentUser(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      permissions: user.permissions,
      mustChangePassword: user.mustChangePassword,
      emailVerified: user.emailVerified,
    };
  }

  @Authenticated()
  @ApiBearerAuth()
  @Post("logout")
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.auth.logout(
      user,
      request.ip || "unknown",
      request.get("user-agent"),
    );
    return { success: true };
  }

  @Authenticated()
  @ApiBearerAuth()
  @Post("change-password")
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ChangePasswordDto,
    @Req() request: Request,
  ) {
    await this.auth.changePassword(
      user,
      input.currentPassword,
      input.newPassword,
      request.ip || "unknown",
    );
    return { success: true, sessionsRevoked: true };
  }

  @RequirePermissions(Permission.USER_MANAGE)
  @ApiBearerAuth()
  @Get("users")
  listUsers(@Query() query: ListUsersDto) {
    return this.auth.listUsers(query.page, query.pageSize);
  }

  @RequirePermissions(Permission.USER_MANAGE)
  @ApiBearerAuth()
  @Post("users")
  createUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: CreateUserDto,
    @Req() request: Request,
  ) {
    return this.auth.createUser(input, actor, request.ip || "unknown");
  }

  @RequirePermissions(Permission.USER_MANAGE)
  @ApiBearerAuth()
  @Patch("users/:id")
  updateUser(
    @Param("id", new ParseUUIDPipe()) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: UpdateUserDto,
    @Req() request: Request,
  ) {
    return this.auth.updateUser(userId, input, actor, request.ip || "unknown");
  }
}
