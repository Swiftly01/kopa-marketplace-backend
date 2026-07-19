import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../domain/users/entities/user.entity';
import { Repository } from 'typeorm';
import { DeviceTokenService } from './device-token.service';
import { NotificationChannel } from '../enums/notification-channel.enum';

@Injectable()
export class RecipentResolverService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly deviceTokenService: DeviceTokenService,
  ) {}

  async resolve(
    userId: string,
    channel: NotificationChannel,
  ): Promise<string[]> {
    if (channel === NotificationChannel.PUSH) {
      const tokens =
        await this.deviceTokenService.getActiveTokensForUser(userId);

      return tokens.map((t) => t.token);
    }

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) return [];

    if (channel === NotificationChannel.EMAIL) {
      return user.email ? [user.email] : [];
    }

    if (channel === NotificationChannel.SMS) {
      return user.phoneNumber ? [user.phoneNumber] : [];
    }

    return [];
  }
}
