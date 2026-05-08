import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { error } from 'console';
import { AppModule } from './app/app.module';
import { AppLogger } from './app/logger/logger.service';
import { JwtAuthGuard } from './app/auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
