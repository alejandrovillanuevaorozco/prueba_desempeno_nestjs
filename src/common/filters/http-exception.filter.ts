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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        message = (res as { message: string | string[] }).message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof QueryFailedError) {
      // Handle PostgreSQL-specific database errors
      const driverError = (exception as any).driverError;
      const code = driverError?.code;

      if (code === '23505') {
        // Unique violation
        statusCode = HttpStatus.CONFLICT;
        message = driverError.detail || 'A record with duplicate unique values already exists';
      } else if (code === '23503') {
        // Foreign key violation
        statusCode = HttpStatus.BAD_REQUEST;
        message = driverError.detail || 'Foreign key constraint violated; referenced resource does not exist';
      } else if (code === '23502') {
        // Not null violation
        statusCode = HttpStatus.BAD_REQUEST;
        message = `Field '${driverError.column}' cannot be null`;
      } else {
        statusCode = HttpStatus.BAD_REQUEST;
        message = exception.message || 'Database query error';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (Array.isArray(message)) {
      message = message.join(', ');
    }

    // Log the error
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

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
