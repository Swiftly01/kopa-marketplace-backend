import { Injectable } from '@nestjs/common';
import { logger } from './logger.config';

@Injectable()
export class AppLogger {
  log(message: any, context?: string) {
    logger.info(
      typeof message === 'string'
        ? { message, context }
        : { ...message, context },
    );
  }

  error(message: any, trace?: string, context?: string) {
    logger.error({
      ...(typeof message === 'string' ? { message } : message),
      trace,
      context,
    });
  }

  warn(message: any, context?: string) {
    logger.warn(
      typeof message === 'string'
        ? { message, context }
        : { ...message, context },
    );
  }

  debug(message: any, context?: string) {
    logger.debug(
      typeof message === 'string'
        ? { message, context }
        : { ...message, context },
    );
  }

  //   constructor(private readonly logger: AppLogger) {}

  // private readonly context = UserService.name;
}
