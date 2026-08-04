import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { IsPublic } from '../../../auth/decorators/public.decorator';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import { UserRole } from '../../../common/enums/roles-enum';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { UpdateReviewDto } from '../dtos/update-review.dto';
import { ReviewQueryDto } from '../dtos/review-query.dto';
import { ReviewService } from '../services/review.service';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('eligibility')
  async checkEligibility(
    @CurrentUser() user: JwtUser,
    @Query('sellerId') sellerId: string,
    @Query('productId') productId: string,
  ) {
    return this.reviewService.checkEligibility(user.id, sellerId, productId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.BUYER)
  @Post()
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateReviewDto) {
    const review = await this.reviewService.createReview(user.id, dto);
    return {
      success: true,
      message: 'Review submitted successfully',
      data: { review },
    };
  }

  @IsPublic()
  @Get('product/:productId')
  async getForProduct(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.reviewService.listForProduct(productId, query, baseUrl);
  }

  @IsPublic()
  @Get('seller/:sellerId')
  async getForSeller(
    @Param('sellerId') sellerId: string,
    @Query() query: ReviewQueryDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.reviewService.listForSeller(sellerId, query, baseUrl);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.BUYER)
  @Patch(':reviewId')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.updateReview(user.id, reviewId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.BUYER)
  @Delete(':reviewId')
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('reviewId') reviewId: string,
  ) {
    await this.reviewService.deleteReview(user.id, reviewId);
    return { success: true, message: 'Review deleted' };
  }
}
