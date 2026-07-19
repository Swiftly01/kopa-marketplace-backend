import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../notification/enums/notification-type.enum';
import { NotificationPriority } from '../../notification/enums/notification-priority.enum';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  public getProfile(@CurrentUser() user: JwtUser) {
    return this.userService.getUserProfile(user.id);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateUserDto,
  ) {
    const result = await this.userService.updateProfile(user.id, dto);
    return { message: 'Profile updated successfully', user: result };
  }

  @Patch('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async updateAvatar(
    @CurrentUser() user: JwtUser,
    @UploadedFile() profilePicture: Express.Multer.File,
  ) {
    if (!profilePicture)
      throw new BadRequestException('Profile picture is required');

    const result = await this.userService.updateAvatar(
      user.id,
      profilePicture.buffer,
      profilePicture.originalname,
    );
    return { message: 'Avatar updated successfully', user: result };
  }

  @Get('notify')
  async sendDemo() {
    return await this.notificationService.send({
      userId: 'a8c59cd6-6288-4929-8aa3-5b0366a135c8',
      type: NotificationType.GENERIC,
      body: `Your store  is now live.`,
      data: { storeName: 'test' },
      priority: NotificationPriority.HIGH,
      idempotencyKey: 'a8c59cd4-6288-4929-8aa3-5b0366a135c8',
    });
  }
}
