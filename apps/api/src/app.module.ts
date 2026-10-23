import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { AuditModule } from "./audit/audit.module";
import { QueuesModule } from "./queues/queues.module";
import { I18nModule } from "./i18n/i18n.module";
import { FeatureFlagsModule } from "./config/feature-flags.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      load: [configuration],
    }),
    DatabaseModule,
    HealthModule,
    AuditModule,
    QueuesModule,
    I18nModule,
    FeatureFlagsModule,
    AuthModule,
  ],
})
export class AppModule {}
