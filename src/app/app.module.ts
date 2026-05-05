import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DomainModule } from './domain/domain.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { LoggerModule } from './logger/logger.module';
import { PaginationModule } from './common/pagination/pagination.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    DomainModule,
    DatabaseModule,
    AuthModule,
    CloudinaryModule,
    LoggerModule,
    PaginationModule,
  ],
})
export class AppModule {}
