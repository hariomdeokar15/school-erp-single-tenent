import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { AuditEvent } from "../audit/entities/audit-event.entity";

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbUrl = configService.get<string>("database.url");
  const environment = configService.get<string>("environment");

  return {
    type: "postgres",
    url: dbUrl,
    entities: [AuditEvent],
    migrations: [__dirname + "/migrations/*.{ts,js}"],
    synchronize: false, // Never auto-synchronize in production or dev
    logging: environment === "development",
    autoLoadEntities: true,
  };
};
