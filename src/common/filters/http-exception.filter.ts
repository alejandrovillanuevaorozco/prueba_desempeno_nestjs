import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * HttpExceptionFilter
 * 
 * In this global exception filter, I centralize application-wide error handling.
 * I catch standard NestJS HttpExceptions as well as low-level PostgreSQL / TypeORM
 * database exceptions (e.g., unique constraint violations, foreign key errors).
 * 
 * By translating raw database errors into meaningful HTTP status codes (such as 409 Conflict
 * or 400 Bad Request), I prevent internal stack trace leakage and guarantee a predictable,
 * clean error payload for frontend clients and API consumers.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * I capture any unhandled exception thrown in the request pipeline and format it
   * into a unified error response envelope.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    // 1. If it's a known NestJS HttpException, I extract its assigned status and message
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        message = (res as { message: string | string[] }).message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof QueryFailedError) {
      // 2. Here I handle PostgreSQL-specific database errors using native SQL error codes
      const driverError = (exception as any).driverError;
      const code = driverError?.code;

      if (code === '23505') {
        // SQL 23505: Unique constraint violation (e.g. duplicate license plate or user email)
        statusCode = HttpStatus.CONFLICT;
        message = driverError.detail || 'A record with duplicate unique values already exists';
      } else if (code === '23503') {
        // SQL 23503: Foreign key constraint violation (e.g. referencing non-existent vehicle)
        statusCode = HttpStatus.BAD_REQUEST;
        message = driverError.detail || 'Foreign key constraint violated; referenced resource does not exist';
      } else if (code === '23502') {
        // SQL 23502: Not-null column constraint violation
        statusCode = HttpStatus.BAD_REQUEST;
        message = `Field '${driverError.column}' cannot be null`;
      } else {
        // Generic database query failure mapped cleanly to 400
        statusCode = HttpStatus.BAD_REQUEST;
        message = exception.message || 'Database query error';
      }
    } else if (exception instanceof Error) {
      // 3. Unhandled standard JavaScript runtime errors
      message = exception.message;
    }

    // 4. I ensure array messages (such as class-validator validation errors) format into clean strings
    if (Array.isArray(message)) {
      message = message.join(', ');
    }

    // 5. I log server errors (>= 500) with their full stack trace, and warnings for client errors (< 500)
    if (statusCode >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Error: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${statusCode} - ${message}`,
      );
    }

    // 6. I send the unified JSON error response to the client
    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

