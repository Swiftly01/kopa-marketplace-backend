import { Module } from '@nestjs/common';
import { AppLogger } from './logger.service';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from '../exceptions/global-exception-filter';

@Module({
  providers: [
    AppLogger,
    LoggingInterceptor,
    GlobalExceptionFilter,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [AppLogger],
})
export class LoggerModule {}
