import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { GetSavedProductsQueryDto } from './dtos/get-saved-product.dto';
import { SavedProductDto } from './dtos/saved-product.dto';
import { SavedProductService } from './saved-product.service';

@UseGuards(JwtAuthGuard)
@Controller('saved-products')
export class SavedProductController {
  constructor(private readonly savedProductsService: SavedProductService) {}
  @Post()
  async saveProduct(
    @CurrentUser() user: JwtUser,
    @Body() dto: SavedProductDto,
  ) {
    const buyerId = user.id;
    return this.savedProductsService.saveProduct(buyerId, dto);
  }

  @Get()
  async getSavedProducts(
    @CurrentUser() user: JwtUser,
    @Query() query: GetSavedProductsQueryDto,
    @Req() req: Request,
  ) {
    const buyerId = user.id;
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.savedProductsService.getSavedProducts(buyerId, query, baseUrl);
  }

  @Get('count')
  async getSavedCount(@CurrentUser() user: JwtUser) {
    const buyerId = user.id;
    const count = await this.savedProductsService.getSavedCount(buyerId);
    return { count };
  }

  @Get(':productId/status')
  async getSaveStatus(
    @CurrentUser() user: JwtUser,
    @Param('productId') productId: string,
  ) {
    const buyerId = user.id;
    return this.savedProductsService.getSaveStatus(buyerId, productId);
  }

  @Post(':productId/toggle')
  async toggleSave(
    @CurrentUser() user: JwtUser,
    @Param('productId') productId: string,
  ): Promise<{ isSaved: boolean }> {
    const buyerId = user.id;
    return this.savedProductsService.toggleSave(buyerId, productId);
  }

  @Delete(':productId')
  async unsaveProduct(
    @CurrentUser() user: JwtUser,
    @Param('productId') productId: string,
  ) {
    const buyerId = user.id;

    return this.savedProductsService.unsaveProduct(buyerId, productId);
  }
}
