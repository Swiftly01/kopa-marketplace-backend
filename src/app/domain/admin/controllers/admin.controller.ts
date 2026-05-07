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
  /**
   * GET /admin/verification/sellers/pending
   * List all sellers pending review (paginated)
   */
  @Get('sellers/pending')
  async getPendingSellers(@Query() query: FilterUsersDto, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    const result = await this.adminApprovalService.getPendingSellers(
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
  /**
   * GET /admin/approval/stats
   * Get approval metrics (pending, approved, rejected, approvalRate)
   */

  @Get('stats')
  async getStatistics() {
    return this.adminApprovalService.getStatistics();
  }

  /**
   * GET /admin/approval/sellers/:sellerId
   * Get complete seller onboarding record for review
   */

  @Get('sellers/:sellerId')
  async getSellerForReview(@Param('sellerId', ParseUUIDPipe) sellerId: string) {
    return this.adminApprovalService.getSellerReview(sellerId, '1');
  }

  /**
   * POST /admin/approval/sellers/:sellerId/approve
   * Approve seller — enables selling access, sends approval email
   */
  @UseGuards(JwtAuthGuard)
  @Post('sellers/:sellerId/approve')
  async approveSeller(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @Body() body: ApproveSellerDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.adminApprovalService.approveSeller(sellerId, user.id);
  }

  /**
   * POST /admin/approval/sellers/:sellerId/reject
   * Reject seller with a reason; optionally reset a specific step
   */
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

  /**
   * PATCH /admin/approval/sellers/:sellerId/steps/:step
   * Verify or reject an individual onboarding step (1–4)
   * Body: { verified: boolean }
   */
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
