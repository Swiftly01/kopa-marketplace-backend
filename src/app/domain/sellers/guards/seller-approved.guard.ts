import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerVerificationStatusEnum } from '../../../common/enums/seller-verification-status.enum';
import {
  JwtUser,
  RequestWithUser,
} from '../../../common/types/request-with-user.interface';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SellerApprovedGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser<JwtUser>>();

    const jwtUser = request.user;

    if (!jwtUser) {
      throw new UnauthorizedException('User  not authenticated');
    }
    const user = await this.userRepository.findOne({
      where: { id: jwtUser.id },
      relations: {
        sellerOnboarding: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (
      user.sellerOnboarding.status !== SellerVerificationStatusEnum.APPROVED
    ) {
      throw new ForbiddenException('Seller account not approved');
    }

    return true;
  }
}
