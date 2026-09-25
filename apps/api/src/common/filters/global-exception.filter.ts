import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiError } from "@schoolerp/contracts";
import { CORRELATION_ID_HEADER } from "../constants";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string) || "N/A";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected server error occurred.";
    let details: Record<string, unknown> | Array<unknown> | undefined =
      undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        errorCode = resObj.error || exception.name;
        if (resObj.message && Array.isArray(resObj.message)) {
          details = resObj.message;
          message = "Validation failed";
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception [${correlationId}]: ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV === "development") {
        message = exception.message;
      }
    }

    const errorResponse: ApiError = {
      statusCode: status,
      errorCode,
      message,
      ...(details ? { details } : {}),
      correlationId,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
