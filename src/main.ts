import {
  BadRequestException,
  ValidationPipe,
  ValidationError,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { error } from 'console';
import { AppModule } from './app/app.module';
import { AppLogger } from './app/logger/logger.service';
import { JwtAuthGuard } from './app/auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  function flattenErrors(errors: ValidationError[]) {
    const result: { field: string; message: string }[] = [];

    errors.forEach((err) => {
      if (err.constraints) {
        result.push({
          field: err.property,
          message: Object.values(err.constraints)[0],
        });
      }

      if (err.children?.length) {
        const childErrors = flattenErrors(err.children);
        result.push(...childErrors);
      }
    });

    return result;
  }

  app.enableCors({
    origin: [
      'https://kopa-mart.vercel.app',
      'http://localhost:8080',
      'https://kopamart.com',
      'https://www.kopamart.com',
    ],
    methods: ['GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'],
    credentials: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        return new BadRequestException({
          statusCode: 400,
          message: flattenErrors(errors),
          error: 'ValidationError',
        });
      },
    }),
  );

  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['health'],
  });
  app.useGlobalGuards(app.get(JwtAuthGuard));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(() => {
  console.error('Failed to start application', error);
  process.exit(1);
});
