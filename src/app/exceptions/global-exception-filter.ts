// import {
//   ExceptionFilter,
//   Catch,
//   ArgumentsHost,
//   HttpException,
//   HttpStatus,
//   Logger,
// } from '@nestjs/common';
// import { Request, Response } from 'express';

// @Catch()
// export class GlobalExceptionFilter implements ExceptionFilter {
//   private readonly logger = new Logger(GlobalExceptionFilter.name);

//   catch(exception: unknown, host: ArgumentsHost) {
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse<Response>();
//     const request = ctx.getRequest<Request>();

//     let status = HttpStatus.INTERNAL_SERVER_ERROR;
//     let message: string | string[] = 'Internal server error';

//     if (exception instanceof HttpException) {
//       status = exception.getStatus();

//       const res =
//         exception instanceof HttpException ? exception.getResponse() : null;

//       if (typeof res === 'string') {
//         message = res;
//       } else if (res && typeof res === 'object') {
//         const r = res as Record<string, unknown>;

//         if (typeof r.message === 'string' || Array.isArray(r.message)) {
//           message = r.message;
//         }
//       }
//     }

//     this.logger.error(
//       `${request.method} ${request.url}`,
//       exception instanceof Error ? exception.stack : undefined,
//     );

//     response.status(status).json({
//       statusCode: status,
//       message,
//       timestamp: new Date().toISOString(),
//       path: request.url,
//     });
//   }
// }

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'ws') {
      // WS `ArgumentsHost.getResponse()` maps to the raw socket.io client,
      // not an Express Response — calling `.status().json()` on it (as the
      // HTTP branch below does) throws a *second*, unhandled TypeError that
      // Nest swallows silently. That means any exception thrown inside a
      // gateway handler (e.g. CallGateway.handleInitiate) previously
      // resulted in total silence: no ack, no `exception` event, nothing —
      // the client's own ack timeout was the only thing that ever fired.
      const client = host
        .switchToWs()
        .getClient<{ emit: (event: string, data: unknown) => void }>();

      let message: string | string[] = 'Something went wrong with the call.';
      if (exception instanceof WsException) {
        const err = exception.getError();
        message = typeof err === 'string' ? err : JSON.stringify(err);
      } else if (exception instanceof HttpException) {
        const res = exception.getResponse();
        if (typeof res === 'string') {
          message = res;
        } else if (res && typeof res === 'object') {
          const r = res as Record<string, unknown>;
          if (typeof r.message === 'string' || Array.isArray(r.message)) {
            message = r.message as string | string[];
          }
        }
      }

      this.logger.error(
        `WS exception: ${Array.isArray(message) ? message.join(', ') : message}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      client.emit('exception', { message });
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const res =
        exception instanceof HttpException ? exception.getResponse() : null;

      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;

        if (typeof r.message === 'string' || Array.isArray(r.message)) {
          message = r.message;
        }
      }
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
