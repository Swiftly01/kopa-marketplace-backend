import { Module } from '@nestjs/common';
import { CallController } from './call.controller';
import { CallService } from './call.service';
import { CallGateway } from './call.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSession } from './call-session.entity';
import { UserModule } from '../users/user.module';
import { AuthModule } from '../../auth/auth.module';
import { MessagesModule } from '../messages/messages.module';
import { CallStateService } from './state/call-state.service';
import { CallRateLimiterService } from './state/call-rate-limiter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallSession]),
    UserModule,
    AuthModule,
    MessagesModule,
  ],
  controllers: [CallController],
  providers: [
    CallService,
    CallGateway,
    CallStateService,
    CallRateLimiterService,
  ],
  exports: [CallService],
})
export class CallModule {}
