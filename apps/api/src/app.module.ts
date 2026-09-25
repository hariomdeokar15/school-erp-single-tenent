import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { AuditModule } from "./audit/audit.module";
import { QueuesModule } from "./queues/queues.module";
import { I18nModule } from "./i18n/i18n.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    HealthModule,
    AuditModule,
    QueuesModule,
    I18nModule,
  ],
})
export class AppModule {}
