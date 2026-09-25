import { describe, it, expect, vi, beforeEach } from "vitest";
import { HealthService } from "../src/health/health.service";
import { HealthController } from "../src/health/health.controller";

describe("Health Module", () => {
  let healthService: HealthService;
  let healthController: HealthController;
  let mockDataSource: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      query: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue("redis://localhost:6379"),
    };
    healthService = new HealthService(mockDataSource, mockConfigService);
    healthController = new HealthController(healthService);
  });

  it("returns valid health payload for GET /health", () => {
    const mockReq = { headers: { "x-correlation-id": "test-uuid-123" } } as any;
    const response = healthController.getHealth(mockReq);

    expect(response.status).toBe("ok");
    expect(response.service).toBe("schoolerp-api");
    expect(response.version).toBe("0.1.0");
    expect(response.correlationId).toBe("test-uuid-123");
    expect(typeof response.uptimeSeconds).toBe("number");
  });

  it("checks database health status", async () => {
    const res = await healthController.getDbHealth();
    expect(res.status).toBe("ok");
    expect(res.component).toBe("database");
  });
});
