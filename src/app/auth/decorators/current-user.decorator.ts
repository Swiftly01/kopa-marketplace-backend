import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  JwtUser,
  RequestWithUser,
} from '../../common/types/request-with-user.interface';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser<JwtUser>>();

    return request.user;
  },
);
