import { Injectable, LoggerService } from '@nestjs/common';
import { logger } from './logger.config';

export interface LogPayload {
  message: string;
  data?: Record<string, any>;
}

export interface LogPayload {
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class AppLogger implements LoggerService {
  private format(
    level: string,
    message: string,
    context?: string,
    data?: Record<string, unknown>,
    trace?: string,
  ) {
    return {
      level,
      message,
      context,
      ...(data ? { data } : {}),
      ...(trace ? { trace } : {}),
      timestamp: new Date().toISOString(),
    };
  }

  log(message: any, context?: string) {
    const payload = this.normalize(message);

    logger.info(this.format('info', payload.message, context, payload.data));
  }

  error(message: any, trace?: string, context?: string) {
    const payload = this.normalize(message);

    logger.error(
      this.format('error', payload.message, context, payload.data, trace),
    );
  }

  warn(message: any, context?: string) {
    const payload = this.normalize(message);

    logger.warn(this.format('warn', payload.message, context, payload.data));
  }

  debug(message: any, context?: string) {
    const payload = this.normalize(message);

    logger.debug(this.format('debug', payload.message, context, payload.data));
  }

  httpLog(data: LogPayload, context = 'HTTP') {
    logger.info(this.format('info', data.message, context, data.data));
  }

  private normalize(message: unknown): LogPayload {
    if (this.isLogPayload(message)) {
      return message;
    }

    return {
      message: String(message),
    };
  }

  private isLogPayload(value: unknown): value is LogPayload {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof (value as Record<string, unknown>).message === 'string'
    );
  }

  //HTTP logs (your custom method)
  //   this.logger.httpLog(
  //   {
  //     message: 'HTTP Request',
  //     data: {
  //       method: 'GET',
  //       url: '/api/v1/admin/sellers/pending',
  //       statusCode: 200,
  //       responseTime: '12ms',
  //     },
  //   },
  //   'HTTP',
  // );

  //Business logic logs (reuse same pattern)
  //   this.logger.log(
  //   {
  //     message: 'User created successfully',
  //     data: {
  //       userId: 123,
  //       role: 'admin',
  //     },
  //   },
  //   'AuthService',
  // );

  //Errors with structure

  //   this.logger.error(
  //   {
  //     message: 'Payment failed',
  //     data: {
  //       orderId: 987,
  //       reason: 'Insufficient funds',
  //     },
  //   },
  //   'STACK_TRACE_HERE',
  //   'PaymentsService',
  // );
}
