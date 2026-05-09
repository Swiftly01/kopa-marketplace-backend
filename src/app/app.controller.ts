import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { IsPublic } from './auth/decorators/public.decorator';

export type Health = {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
  
  
   *
   * @returns Health status
   *
   * @example
   * GET /health
   */
  @IsPublic()
  @Get('health')
  getHealth(): Health {
    return this.appService.getHealth();
  }
}
