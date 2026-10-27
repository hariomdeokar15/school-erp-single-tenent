import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>("redis.url") || "redis://localhost:6379";
        const url = new URL(redisUrl);
        const database = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;

        if (!Number.isInteger(database) || database < 0) {
          throw new Error("REDIS_URL path must contain a non-negative database number");
        }

        return {
          connection: {
            host: url.hostname || "localhost",
            port: Number(url.port || 6379),
            username: url.username ? decodeURIComponent(url.username) : undefined,
            password: url.password ? decodeURIComponent(url.password) : undefined,
            db: database,
            tls: url.protocol === "rediss:" ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
