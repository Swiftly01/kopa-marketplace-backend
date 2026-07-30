import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { CallService } from './call.service';
import { CallHistoryQueryDto } from './dtos/call-history-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Get()
  getCallHistory(
    @Query() query: CallHistoryQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.callService.getCallHistory(user.id, query);
  }

  @Get(':id')
  getCall(@Param('id') id: string) {
    return this.callService.findById(id);
  }
}
