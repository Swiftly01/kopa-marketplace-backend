import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { error } from 'console';
import { GlobalExceptionFilter } from './app/exceptions/global-exception-filter';
import { JwtAuthGuard } from './app/auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new GlobalExceptionFilter());
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
