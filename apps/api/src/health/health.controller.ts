import { Controller, Get, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { Request } from "express";
import { HealthService } from "./health.service";
import {
  HealthStatusResponse,
  ComponentHealthResponse,
} from "@schoolerp/contracts";
import { CORRELATION_ID_HEADER } from "../common/constants";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Get overall API health and uptime status" })
  @SwaggerApiResponse({ status: 200, description: "API health status" })
  getHealth(@Req() req: Request): HealthStatusResponse {
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      (req as any).correlationId;
    return this.healthService.getApiHealth(correlationId);
  }

  @Get("db")
  @ApiOperation({ summary: "Check PostgreSQL database connectivity" })
  @SwaggerApiResponse({ status: 200, description: "Database health status" })
  async getDbHealth(): Promise<ComponentHealthResponse> {
    return this.healthService.getDatabaseHealth();
  }

  @Get("redis")
  @ApiOperation({ summary: "Check Redis cache connectivity" })
  @SwaggerApiResponse({ status: 200, description: "Redis health status" })
  async getRedisHealth(): Promise<ComponentHealthResponse> {
    return this.healthService.getRedisHealth();
  }
}
