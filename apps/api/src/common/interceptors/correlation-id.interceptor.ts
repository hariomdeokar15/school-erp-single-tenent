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
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    let correlationId = request.headers[CORRELATION_ID_HEADER];
    if (!correlationId) {
      correlationId = randomUUID();
      request.headers[CORRELATION_ID_HEADER] = correlationId;
    }
    request.correlationId = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}
