import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { AuthController } from "./auth.controller";
import { AuthRateLimitService } from "./auth-rate-limit.service";
import { AuthenticationGuard } from "./auth.guard";
import { AuthorizationGuard } from "./authorization.guard";
import { AuthService } from "./auth.service";
import { AuthSession } from "./entities/auth-session.entity";
import { RoleAssignment } from "./entities/role-assignment.entity";
import { User } from "./entities/user.entity";
import { EmailVerificationToken } from "./entities/email-verification-token.entity";
import { PasswordResetToken } from "./entities/password-reset-token.entity";
import { EmailOutbox } from "./entities/email-outbox.entity";
import { EmailOutboxCryptoService } from "./email-outbox-crypto.service";
import { EmailOutboxService } from "./email-outbox.service";
import { AuthMailService } from "./auth-mail.service";

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      User,
      RoleAssignment,
      AuthSession,
      EmailVerificationToken,
      PasswordResetToken,
      EmailOutbox,
    ]),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailOutboxCryptoService,
    EmailOutboxService,
    AuthMailService,
    AuthRateLimitService,
    AuthenticationGuard,
    AuthorizationGuard,
    { provide: APP_GUARD, useExisting: AuthenticationGuard },
    { provide: APP_GUARD, useExisting: AuthorizationGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
