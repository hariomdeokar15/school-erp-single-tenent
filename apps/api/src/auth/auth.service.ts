import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import {
  randomBytes,
  createHash,
  timingSafeEqual,
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  sign as signBytes,
  verify as verifyBytes,
} from "crypto";
import * as argon2 from "argon2";
import { DataSource, IsNull, Repository } from "typeorm";
import { UserRole } from "@schoolerp/contracts";
import { AuditService } from "../audit/services/audit.service";
import { AuthSession } from "./entities/auth-session.entity";
import { RoleAssignment } from "./entities/role-assignment.entity";
import { User, UserStatus } from "./entities/user.entity";
import { AuthenticatedUser, AuthTokenPair } from "./auth.types";
import { permissionsForRoles } from "./auth.permissions";
import { AuthRateLimitService } from "./auth-rate-limit.service";

const ACCESS_TOKEN_SECONDS = 15 * 60;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PLACEHOLDER_KEY = "<GENERATED_IN_SECRET_MANAGER>";

@Injectable()
export class AuthService {
  private readonly issuer = "schoolerp-api";
  private readonly audience = "schoolerp-clients";
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly dummyHashPromise: Promise<string>;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly sessions: Repository<AuthSession>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly rateLimit: AuthRateLimitService,
  ) {
    const privateKey = config.get<string>("auth.privateKey")!;
    const publicKey = config.get<string>("auth.publicKey")!;
    if (privateKey === PLACEHOLDER_KEY || publicKey === PLACEHOLDER_KEY) {
      if (config.get<string>("environment") === "production") {
        throw new Error("Production JWT key pair is required");
      }
      const generated = generateKeyPairSync("rsa", { modulusLength: 2048 });
      this.privateKey = generated.privateKey
        .export({ type: "pkcs8", format: "pem" })
        .toString();
      this.publicKey = generated.publicKey
        .export({ type: "spki", format: "pem" })
        .toString();
    } else {
      this.privateKey = privateKey.replace(/\\n/g, "\n");
      this.publicKey = publicKey.replace(/\\n/g, "\n");
    }
    const signingKey = createPrivateKey(this.privateKey);
    const verificationKey = createPublicKey(this.publicKey);
    if (
      signingKey.asymmetricKeyType !== "rsa" ||
      (signingKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    ) {
      throw new Error("JWT signing key must be RSA with at least 2048 bits.");
    }
    const keyCheck = randomBytes(32);
    const keyCheckSignature = signBytes("RSA-SHA256", keyCheck, signingKey);
    if (
      !verifyBytes("RSA-SHA256", keyCheck, verificationKey, keyCheckSignature)
    ) {
      throw new Error("JWT private and public keys do not match.");
    }
    this.dummyHashPromise = argon2.hash(randomBytes(32), {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async login(
    emailInput: string,
    password: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthTokenPair> {
    const email = this.normalizeEmail(emailInput);
    await this.rateLimit.checkLogin(email, ipAddress);
    const user = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .leftJoinAndSelect("user.roleAssignments", "roleAssignment")
      .where("user.email = :email", { email })
      .getOne();

    const encodedHash = user?.passwordHash ?? (await this.dummyHashPromise);
    const passwordMatches = await argon2
      .verify(encodedHash, password)
      .catch(() => false);
    if (!user || !passwordMatches || user.status !== UserStatus.ACTIVE) {
      await this.rateLimit.recordFailure(email);
      await this.audit.recordEvent({
        actorId: user?.id,
        actorRole: user?.roleAssignments[0]?.role,
        action: "auth.login.failed",
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.rateLimit.clearFailures(email);
    const { session, secret } = await this.createSession(
      user.id,
      ipAddress,
      userAgent,
    );
    const roles = user.roleAssignments.map((assignment) => assignment.role);
    const authUser = this.toUser(user, session.id, roles);
    const tokens = await this.issueTokens(authUser, session.id, secret);
    await this.audit.recordEvent({
      actorId: user.id,
      actorRole: roles[0],
      action: "auth.login.succeeded",
      entityName: "auth_session",
      entityId: session.id,
      ipAddress,
      userAgent,
    });
    return tokens;
  }

  async refresh(
    refreshToken: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthTokenPair> {
    const [sessionId, secret, ...extra] = refreshToken.split(".");
    if (
      !sessionId ||
      !secret ||
      extra.length ||
      !/^[0-9a-f-]{36}$/i.test(sessionId)
    ) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const tokens = await this.dataSource.transaction(async (manager) => {
      const sessionRepository = manager.getRepository(AuthSession);
      const session = await sessionRepository
        .createQueryBuilder("session")
        .addSelect("session.refreshTokenHash")
        .where("session.id = :sessionId", { sessionId })
        .setLock("pessimistic_write")
        .getOne();
      if (!session) throw new UnauthorizedException("Invalid refresh token.");

      const suppliedHash = this.hash(secret);
      if (!this.constantTimeEqual(session.refreshTokenHash, suppliedHash)) {
        await sessionRepository.update(session.id, { revokedAt: new Date() });
        return null;
      }
      const user = await manager.getRepository(User).findOne({
        where: { id: session.userId },
        relations: { roleAssignments: true },
      });
      if (
        session.revokedAt ||
        session.expiresAt.getTime() <= Date.now() ||
        !user ||
        user.status !== UserStatus.ACTIVE
      ) {
        throw new UnauthorizedException("Session has expired or been revoked.");
      }

      const nextSecret = randomBytes(32).toString("base64url");
      session.refreshTokenHash = this.hash(nextSecret);
      await sessionRepository.save(session);
      const roles = user.roleAssignments.map((assignment) => assignment.role);
      const authUser = this.toUser(user, session.id, roles);
      const tokens = await this.issueTokens(authUser, session.id, nextSecret);
      await this.audit.recordEvent({
        actorId: authUser.id,
        actorRole: roles[0],
        action: "auth.session.refreshed",
        entityName: "auth_session",
        entityId: session.id,
        ipAddress,
        userAgent,
      });
      return tokens;
    });
    if (!tokens) throw new UnauthorizedException("Invalid refresh token.");
    return tokens;
  }

  async authenticateAccessToken(token: string): Promise<AuthenticatedUser> {
    let claims: { sub: string; sid: string };
    try {
      claims = await this.jwt.verifyAsync(token, {
        publicKey: this.publicKey,
        algorithms: ["RS256"],
        issuer: this.issuer,
        audience: this.audience,
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired access token.");
    }
    if (!claims.sub || !claims.sid) throw new UnauthorizedException();

    const session = await this.sessions.findOne({
      where: { id: claims.sid, userId: claims.sub },
      relations: { user: { roleAssignments: true } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException("Session has expired or been revoked.");
    }
    const roles = session.user.roleAssignments.map(
      (assignment) => assignment.role,
    );
    return this.toUser(session.user, session.id, roles);
  }

  async logout(
    user: AuthenticatedUser,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.sessions.update(
      { id: user.sessionId, userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    await this.audit.recordEvent({
      actorId: user.id,
      actorRole: user.roles[0],
      action: "auth.logout",
      entityName: "auth_session",
      entityId: user.sessionId,
      ipAddress,
      userAgent,
    });
  }

  async changePassword(
    user: AuthenticatedUser,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
  ): Promise<void> {
    const dbUser = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: user.id })
      .getOne();
    if (
      !dbUser ||
      !(await argon2.verify(dbUser.passwordHash, currentPassword))
    ) {
      throw new UnauthorizedException("Current password is incorrect.");
    }
    if (currentPassword === newPassword) {
      throw new ConflictException(
        "Choose a password different from the current password.",
      );
    }
    const newHash = await this.hashPassword(newPassword);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).update(user.id, {
        passwordHash: newHash,
        mustChangePassword: false,
      });
      await manager
        .getRepository(AuthSession)
        .update(
          { userId: user.id, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
    });
    await this.audit.recordEvent({
      actorId: user.id,
      actorRole: user.roles[0],
      action: "auth.password.changed",
      entityName: "user",
      entityId: user.id,
      ipAddress,
    });
  }

  async createUser(
    input: {
      email: string;
      displayName: string;
      role: UserRole;
      initialPassword: string;
    },
    actor: AuthenticatedUser,
    ipAddress: string,
  ): Promise<{ id: string; email: string; role: UserRole }> {
    const privilegedRoles = [
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.PRINCIPAL,
    ];
    if (
      privilegedRoles.includes(input.role) &&
      !actor.roles.includes(UserRole.OWNER)
    ) {
      throw new ForbiddenException(
        "Only an owner can provision privileged accounts.",
      );
    }
    const email = this.normalizeEmail(input.email);
    const passwordHash = await this.hashPassword(input.initialPassword);
    const created = await this.dataSource
      .transaction(async (manager) => {
        const userRepository = manager.getRepository(User);
        const assignmentRepository = manager.getRepository(RoleAssignment);
        const user = userRepository.create({
          email,
          displayName: input.displayName.trim(),
          passwordHash,
          status: UserStatus.ACTIVE,
          mustChangePassword: true,
        });
        await userRepository.save(user);
        await assignmentRepository.save(
          assignmentRepository.create({ userId: user.id, role: input.role }),
        );
        return user;
      })
      .catch((error: unknown) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new ConflictException(
            "An account with this email already exists.",
          );
        }
        throw error;
      });

    await this.audit.recordEvent({
      actorId: actor.id,
      actorRole: actor.roles[0],
      action: "auth.user.created",
      entityName: "user",
      entityId: created.id,
      ipAddress,
      metadata: { role: input.role },
    });
    return { id: created.id, email: created.email, role: input.role };
  }

  async listUsers(page: number, pageSize: number) {
    const [users, total] = await this.users
      .createQueryBuilder("user")
      .select([
        "user.id",
        "user.email",
        "user.displayName",
        "user.status",
        "user.mustChangePassword",
        "user.createdAt",
      ])
      .leftJoinAndSelect("user.roleAssignments", "roleAssignment")
      .orderBy("user.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        roles: user.roleAssignments.map((assignment) => assignment.role),
        createdAt: user.createdAt,
      })),
      page,
      pageSize,
      total,
    };
  }

  async updateUser(
    userId: string,
    input: { role?: UserRole; status?: UserStatus },
    actor: AuthenticatedUser,
    ipAddress: string,
  ) {
    if (input.role === undefined && input.status === undefined) {
      throw new ConflictException("Provide a role or status change.");
    }
    if (
      userId === actor.id &&
      (input.status === UserStatus.DISABLED || input.role !== undefined)
    ) {
      throw new ConflictException(
        "Ask another owner to change your own account access.",
      );
    }
    const privilegedRoles = [
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.PRINCIPAL,
    ];
    if (
      input.role &&
      privilegedRoles.includes(input.role) &&
      !actor.roles.includes(UserRole.OWNER)
    ) {
      throw new ForbiddenException(
        "Only an owner can assign a privileged role.",
      );
    }

    const changed = await this.dataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock($1)", [93741028]);
      const userRepository = manager.getRepository(User);
      const assignmentRepository = manager.getRepository(RoleAssignment);
      const target = await userRepository.findOne({
        where: { id: userId },
        relations: { roleAssignments: true },
      });
      if (!target) throw new NotFoundException("User account was not found.");
      const currentRoles = target.roleAssignments.map(
        (assignment) => assignment.role,
      );
      if (
        (currentRoles.some((role) => privilegedRoles.includes(role)) ||
          (input.role !== undefined && privilegedRoles.includes(input.role))) &&
        !actor.roles.includes(UserRole.OWNER)
      ) {
        throw new ForbiddenException(
          "Only an owner can change privileged accounts.",
        );
      }
      const removesOwner =
        currentRoles.includes(UserRole.OWNER) &&
        ((input.role !== undefined && input.role !== UserRole.OWNER) ||
          input.status === UserStatus.DISABLED);
      if (removesOwner && target.status === UserStatus.ACTIVE) {
        const activeOwners = await userRepository
          .createQueryBuilder("user")
          .innerJoin(
            "user.roleAssignments",
            "roleAssignment",
            "roleAssignment.role = :role",
            { role: UserRole.OWNER },
          )
          .where("user.status = :status", { status: UserStatus.ACTIVE })
          .getCount();
        if (activeOwners <= 1) {
          throw new ConflictException(
            "The last active owner account cannot be removed or disabled.",
          );
        }
      }

      let roleChanged = false;
      if (input.role && !currentRoles.includes(input.role)) {
        await assignmentRepository.delete({ userId });
        await assignmentRepository.save({ userId, role: input.role });
        roleChanged = true;
      }
      if (input.status) target.status = input.status;
      if (input.status) await userRepository.save(target);
      if (roleChanged || input.status === UserStatus.DISABLED) {
        await manager
          .getRepository(AuthSession)
          .update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
      }
      return {
        id: target.id,
        email: target.email,
        status: target.status,
        roles: input.role ? [input.role] : currentRoles,
      };
    });

    await this.audit.recordEvent({
      actorId: actor.id,
      actorRole: actor.roles[0],
      action: "auth.user.updated",
      entityName: "user",
      entityId: changed.id,
      ipAddress,
      metadata: {
        status: input.status,
        role: input.role,
      },
    });
    return changed;
  }

  private async createSession(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<{ session: AuthSession; secret: string }> {
    const secret = randomBytes(32).toString("base64url");
    const session = this.sessions.create({
      userId,
      refreshTokenHash: this.hash(secret),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      revokedAt: null,
      ipAddress: ipAddress || null,
      userAgent: userAgent?.slice(0, 512) || null,
    });
    await this.sessions.save(session);
    return { session, secret };
  }

  private async issueTokens(
    user: AuthenticatedUser,
    sessionId: string,
    refreshSecret?: string,
  ): Promise<AuthTokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId },
      {
        privateKey: this.privateKey,
        algorithm: "RS256",
        issuer: this.issuer,
        audience: this.audience,
        expiresIn: ACCESS_TOKEN_SECONDS,
      },
    );
    if (!refreshSecret) throw new Error("Refresh token secret is unavailable");
    return {
      accessToken,
      refreshToken: `${sessionId}.${refreshSecret}`,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        mustChangePassword: user.mustChangePassword,
        roles: user.roles,
        permissions: user.permissions,
      },
    };
  }

  private toUser(
    user: User,
    sessionId: string,
    roles: UserRole[],
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      sessionId,
      mustChangePassword: user.mustChangePassword,
      roles,
      permissions: permissionsForRoles(roles),
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private constantTimeEqual(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
