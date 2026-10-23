import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { AuditEvent } from "../audit/entities/audit-event.entity";
import { User } from "../auth/entities/user.entity";
import { RoleAssignment } from "../auth/entities/role-assignment.entity";
import { AuthSession } from "../auth/entities/auth-session.entity";

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbUrl = configService.get<string>("database.url");
  const environment = configService.get<string>("environment");

  return {
    type: "postgres",
    url: dbUrl,
    entities: [AuditEvent, User, RoleAssignment, AuthSession],
    migrations: [__dirname + "/migrations/*.{ts,js}"],
    synchronize: false, // Never auto-synchronize in production or dev
    logging: environment === "development",
    autoLoadEntities: true,
  };
};
