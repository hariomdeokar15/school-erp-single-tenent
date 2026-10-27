import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { CORRELATION_ID_HEADER } from "../constants";
import { randomUUID } from "crypto";

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{
        headers: Record<string, string | string[] | undefined>;
        correlationId?: string;
      }>();
    const response = context.switchToHttp().getResponse();

    const headerValue = request.headers[CORRELATION_ID_HEADER];
    const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const isSafeCorrelationId =
      typeof candidate === "string" &&
      candidate.length <= 128 &&
      /^[A-Za-z0-9._:-]+$/.test(candidate);
    const correlationId = isSafeCorrelationId ? candidate : randomUUID();

    request.correlationId = correlationId;
    request.headers[CORRELATION_ID_HEADER] = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}
