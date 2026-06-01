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

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
}
