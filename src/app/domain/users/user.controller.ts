import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  public getProfile(@CurrentUser() user: JwtUser) {
    return this.userService.getUserProfile(user.id);
  }
}
