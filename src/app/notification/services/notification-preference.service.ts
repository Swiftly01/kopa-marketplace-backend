import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { Repository } from 'typeorm';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { UpdatePreferenceDto } from '../dtos/update-preference.dto';

@Injectable()
export class NotificationPreferenceService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
  ) {}

  async getEnabledChannels(userId: string): Promise<NotificationChannel[]> {
    const overrides = await this.preferenceRepository.find({
      where: { userId },
    });

    const disabled = new Set(
      overrides.filter((o) => !o.enabled).map((o) => o.channel),
    );

    return Object.values(NotificationChannel).filter(
      (channel) => !disabled.has(channel),
    );
  }

  async enableAllChannels(userId: string): Promise<void> {
    const existing = await this.preferenceRepository.find({
      where: { userId },
    });

    const existingChannels = new Set(existing.map((p) => p.channel));

    const missing = Object.values(NotificationChannel)
      .filter((channel) => !existingChannels.has(channel))
      .map((channel) =>
        this.preferenceRepository.create({
          userId,
          channel,
          enabled: true,
        }),
      );

    if (missing.length > 0) {
      await this.preferenceRepository.save(missing);
    }
  }
  async getPreference(
    userId: string,
    channel: NotificationChannel,
  ): Promise<NotificationPreference | null> {
    return this.preferenceRepository.findOne({
      where: { userId, channel },
    });
  }

  async listForUser(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepository.find({
      where: { userId },
    });
  }

  async upsert(userId: string, dto: UpdatePreferenceDto) {
    let preference = await this.preferenceRepository.findOne({
      where: { userId, channel: dto.channel },
    });

    if (!preference) {
      preference = this.preferenceRepository.create({
        userId,
        channel: dto.channel,
      });
    }

    preference.enabled = dto.enabled;
    if (dto.quietHoursStart !== undefined)
      preference.quietHoursStart = dto.quietHoursStart;
    if (dto.quietHoursEnd !== undefined)
      preference.quietHoursEnd = dto.quietHoursEnd;
    if (dto.timezone !== undefined) preference.timezone = dto.timezone;

    return this.preferenceRepository.save(preference);
  }
}
