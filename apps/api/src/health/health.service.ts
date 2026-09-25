import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";
import {
  HealthStatusResponse,
  ComponentHealthResponse,
} from "@schoolerp/contracts";

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  getApiHealth(correlationId: string): HealthStatusResponse {
    return {
      status: "ok",
      service: "schoolerp-api",
      version: "0.1.0",
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      correlationId: correlationId || "N/A",
    };
  }

  async getDatabaseHealth(): Promise<ComponentHealthResponse> {
    const startTime = Date.now();
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        await this.dataSource.query("SELECT 1");
        return {
          status: "ok",
          component: "database",
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }
      return {
        status: "down",
        component: "database",
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: "down",
        component: "database",
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getRedisHealth(): Promise<ComponentHealthResponse> {
    const startTime = Date.now();
    const redisUrl =
      this.configService.get<string>("redis.url") || "redis://localhost:6379";
    let client: Redis | null = null;
    try {
      client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
      });
      const pingRes = await client.ping();
      await client.quit();
      if (pingRes === "PONG") {
        return {
          status: "ok",
          component: "redis",
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }
      return {
        status: "down",
        component: "redis",
        timestamp: new Date().toISOString(),
      };
    } catch {
      if (client) {
        client.disconnect();
      }
      return {
        status: "down",
        component: "redis",
        timestamp: new Date().toISOString(),
      };
    }
  }
}
