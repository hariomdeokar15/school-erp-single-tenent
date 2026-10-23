import { DataSource, DataSourceOptions } from "typeorm";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { AuditEvent } from "../audit/entities/audit-event.entity";
import { User } from "../auth/entities/user.entity";
import { RoleAssignment } from "../auth/entities/role-assignment.entity";
import { AuthSession } from "../auth/entities/auth-session.entity";

// The CLI runs from apps/api. Load its local file first and the repository file
// as a fallback; existing process environment values always take precedence.
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../../.env") });

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    "postgresql://schoolerp:CHANGE_ME_LOCAL_ONLY@localhost:5432/schoolerp",
  entities: [AuditEvent, User, RoleAssignment, AuthSession],
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  synchronize: false, // Strict migration discipline
  logging: process.env.NODE_ENV === "development",
  migrationsTableName: "typeorm_migrations",
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
