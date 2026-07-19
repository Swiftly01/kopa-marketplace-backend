import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeviceToken } from '../entities/device-token.entity';
import { Repository } from 'typeorm';
import { RegisterDeviceTokenDto } from '../dtos/register-device-token.dto';
import { NotificationPreferenceService } from './notification-preference.service';

@Injectable()
export class DeviceTokenService {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    private readonly notificationPreferenceService: NotificationPreferenceService,
  ) {}

  async register(
    userId: string,
    dto: RegisterDeviceTokenDto,
  ): Promise<DeviceToken> {
    let record = await this.deviceTokenRepository.findOne({
      where: { token: dto.token },
    });

    if (!record) {
      record = this.deviceTokenRepository.create({
        userId,
        token: dto.token,
        platform: dto.platform,
      });
    } else {
      record.userId = userId;
      record.platform = dto.platform;
      record.isActive = true;
    }

    record.lastUsedAt = new Date();
    const saved = await this.deviceTokenRepository.save(record);

    // Ensure notification preferences exist
    await this.notificationPreferenceService.enableAllChannels(userId);

    return saved;
  }

  async deactivate(token: string): Promise<void> {
    await this.deviceTokenRepository.update({ token }, { isActive: false });
  }

  async getActiveTokensForUser(userId: string): Promise<DeviceToken[]> {
    return await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
    });
  }
}
