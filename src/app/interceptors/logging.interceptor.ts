// import {
//   CallHandler,
//   ExecutionContext,
//   Injectable,
//   NestInterceptor,
// } from '@nestjs/common';
// import { Observable, tap } from 'rxjs';
// import { AppLogger } from '../logger/logger.service';
// import { Request, Response } from 'express';

// @Injectable()
// export class LoggingInterceptor implements NestInterceptor {
//   constructor(private readonly logger: AppLogger) {}
//   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//     const now = Date.now();

//     const http = context.switchToHttp();
//     const request = http.getRequest<Request>();
//     const response = http.getResponse<Response>();

//     const { method, originalUrl } = request;
//     return next.handle().pipe(
//       tap(() => {
//         const delay = Date.now() - now;
//         const statusCode = response.statusCode;

//         this.logger.httpLog(
//           {
//             message: 'HTTP Request',
//             data: {
//               method,
//               url: originalUrl,
//               statusCode,
//               responseTime: `${delay}ms`,
//             },
//           },
//           'HTTP',
//         );
//       }),
//     );
//   }
// }

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AppLogger } from '../logger/logger.service';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // This interceptor is registered globally (APP_INTERCEPTOR), so it also
    // wraps every WS gateway handler (e.g. CallGateway). It's written
    // assuming an HTTP request/response pair; for a WS context,
    // `switchToHttp().getRequest()/getResponse()` don't return real Express
    // objects, and logging against them was masking failures downstream.
    // Skip anything that isn't HTTP so WS handlers are unaffected.
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const now = Date.now();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { method, originalUrl } = request;
    return next.handle().pipe(
      tap(() => {
        const delay = Date.now() - now;
        const statusCode = response.statusCode;

        this.logger.httpLog(
          {
            message: 'HTTP Request',
            data: {
              method,
              url: originalUrl,
              statusCode,
              responseTime: `${delay}ms`,
            },
          },
          'HTTP',
        );
      }),
    );
  }
}
