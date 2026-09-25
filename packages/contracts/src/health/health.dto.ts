export interface HealthStatusResponse {
  status: "ok" | "degraded" | "down";
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  correlationId: string;
}

export interface ComponentHealthResponse {
  status: "ok" | "down";
  component: "database" | "redis";
  latencyMs?: number;
  timestamp: string;
}
