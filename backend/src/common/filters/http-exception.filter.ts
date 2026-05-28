import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = uuidv4();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        title = resp.error || exception.message;
        detail = resp.message || exception.message;

        if (Array.isArray(resp.message)) {
          detail = 'Validation failed';
          errors = this.parseValidationErrors(resp.message);
        }
      } else {
        title = exceptionResponse as string;
        detail = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      detail = exception.message || 'An unexpected error occurred';
    }

    const problemDetails = {
      type: `https://ereko.market/errors/${status}`,
      title,
      status,
      detail,
      instance: request.url,
      trace_id: traceId,
      ...(errors && { errors }),
    };

    if (status >= 500) {
      this.logger.error(`[${traceId}] ${status} ${request.method} ${request.url}: ${detail}`);
    }

    response.status(status).json(problemDetails);
  }

  private parseValidationErrors(messages: string[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const msg of messages) {
      const parts = msg.split(' ');
      const field = parts[0];
      if (!errors[field]) errors[field] = [];
      errors[field].push(msg);
    }
    return errors;
  }
}
