import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { AppLogger } from '../../logger/logger.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepositry: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly logger: AppLogger,
  ) {}

  public async getUserProfile(userId: string) {
    const user = await this.userRepositry.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  public async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepositry.findOne({
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

    return this.userRepositry.save(user);
  }

  public async updateAvatar(
    userId: string,
    buffer: Buffer,
    originalName: string,
  ) {
    const user = await this.userRepositry.findOne({
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

      return this.userRepositry.save(user);
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
}
