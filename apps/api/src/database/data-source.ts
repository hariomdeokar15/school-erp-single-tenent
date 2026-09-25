import { DataSource, DataSourceOptions } from "typeorm";
import { AuditEvent } from "../audit/entities/audit-event.entity";

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    "postgresql://schoolerp:CHANGE_ME@localhost:5432/schoolerp",
  entities: [AuditEvent],
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  synchronize: false, // Strict migration discipline
  logging: process.env.NODE_ENV === "development",
  migrationsTableName: "typeorm_migrations",
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
