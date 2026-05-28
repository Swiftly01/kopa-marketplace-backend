import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FilterUsersDto } from '../dtos/filter-users-dto';
import { AdminApprovalService } from '../services/admin-approval.service';
import { PendingSellerResponseDto } from '../dtos/pending-seller-response-dto';
import type { Request } from 'express';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import { RejectSellerDto } from '../dtos/reject-seller-dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ApproveSellerDto } from '../dtos/approve-seller-dto';
import { VerifyStepDto } from '../dtos/verifiy-step-dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminApprovalService: AdminApprovalService) {}

  @Get('sellers/verifications')
  async getPendingSellers(@Query() query: FilterUsersDto, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    const result = await this.adminApprovalService.getSellersVerification(
      query,
      baseUrl,
    );

    return {
      ...result,
      data: result.data.map((item) =>
        PendingSellerResponseDto.fromEntity(item),
      ),
    };
  }

  @Get('stats')
  async getStatistics() {
    return this.adminApprovalService.getStatistics();
  }

  @Get('sellers/:sellerId')
  async getSellerForReview(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const adminId = user.id;
    return this.adminApprovalService.getSellerReview(sellerId, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sellers/:sellerId/approve')
  async approveSeller(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @Body() body: ApproveSellerDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.adminApprovalService.approveSeller(sellerId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sellers/:sellerId/reject')
  async rejectSeller(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @Body() body: RejectSellerDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.adminApprovalService.rejectSeller(
      sellerId,
      user.id,
      body.rejectionReason,
      body.stepToReject,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('sellers/:sellerId/steps/:step')
  async verifyStep(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @Param('step', ParseIntPipe) step: number,
    @Body() body: VerifyStepDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.adminApprovalService.verifyStep(
      sellerId,
      step,
      body.verified,
      user.id,
    );
  }
}
