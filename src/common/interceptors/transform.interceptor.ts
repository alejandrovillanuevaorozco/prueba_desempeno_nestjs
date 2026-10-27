import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard ApiResponse envelope
 * 
 * I defined this generic interface to guarantee a uniform contract across
 * all successful REST API endpoints in the FleetCore platform.
 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
}

/**
 * TransformInterceptor
 * 
 * In this interceptor, I wrap every outgoing successful HTTP response inside
 * a predictable and uniform JSON envelope containing the numeric status code,
 * a success flag, the encapsulated response payload, and an ISO timestamp.
 * 
 * Note: I explicitly enforce numeric HTTP status codes (e.g. 200, 201) rather than
 * word-based representations, ensuring standard REST compliance and client interoperability.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  /**
   * I intercept the handler execution pipeline, read the numeric status code from the
   * response context, and map the underlying stream emission into my standardized envelope.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // 1. I retrieve the current HTTP response to inspect its numeric status code
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode || 200;

    // 2. I pipe the RxJS stream and transform the data into my standard response format
    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        data: data ?? null,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

