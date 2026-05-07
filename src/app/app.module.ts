import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { DomainModule } from './domain/domain.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    DomainModule,
    DatabaseModule,
    AuthModule,
    CloudinaryModule,
    LoggerModule,
    CommonModule,
  ],
})
export class AppModule {}
