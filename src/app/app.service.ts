import { Injectable } from '@nestjs/common';
import { Health } from './app.controller';

@Injectable()
export class AppService {
  /**
   * Get health check information
   *
   * @returns Health status
   */
  getHealth(): Health {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Kopa Marketplace App',
      version: '1.0.o',
    };
  }
}
