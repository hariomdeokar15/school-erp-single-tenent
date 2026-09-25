export interface ApiError {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: Record<string, unknown> | Array<unknown>;
  correlationId: string;
  timestamp: string;
}
