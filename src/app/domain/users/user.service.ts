import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { ChatStatus } from '../../common/enums/user-status.enum';
import { AppLogger } from '../../logger/logger.service';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly logger: AppLogger,
  ) {}

  public async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['sellerOnboarding'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  public async findById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  public async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phoneNumber) user.phoneNumber = dto.phoneNumber;

    return this.userRepository.save(user);
  }

  public async updateAvatar(
    userId: string,
    buffer: Buffer,
    originalName: string,
  ) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let newPublicId: string | null = null;

    try {
      this.cloudinaryService.validateFile(buffer, originalName);
      const upload = await this.cloudinaryService.uploadFile(
        buffer,
        originalName,
        `users/${userId}/profile`,
        ['user', 'avatar', userId],
      );
      newPublicId = upload.publicId;

      // Delete old avatar (best-effort)
      if (user.profilePicturePublicId) {
        try {
          await this.cloudinaryService.deleteFile(user.profilePicturePublicId);
        } catch (e) {
          this.logger.warn(
            `Could not delete old avatar (${user.profilePicturePublicId}): ${e}`,
          );
        }
      }

      user.profilePicturePublicId = upload.publicId;
      user.profilePictureUrl = upload.secureUrl;
      user.profilePictureThumbnailUrl = upload.thumbnailUrl ?? null;

      return this.userRepository.save(user);
    } catch (error) {
      if (newPublicId) {
        try {
          await this.cloudinaryService.deleteFile(newPublicId);
        } catch (cleanupError) {
          this.logger.error(
            `Cloudinary rollback failed for ${newPublicId}`,
            cleanupError instanceof Error ? cleanupError.stack : undefined,
          );
        }
      }

      this.logger.error(
        `Cloudinary rollback failed for ${newPublicId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  async updateUserStatus(id: string, chatStatus: ChatStatus): Promise<void> {
    await this.userRepository.update(id, {
      chatStatus,
      lastSeenAt: chatStatus === ChatStatus.OFFLINE ? new Date() : undefined,
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'Unknown error occurred';
  }
}
