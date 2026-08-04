import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { InteractionService } from '../services/interaction.service';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/roles-enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../../common/types/request-with-user.interface';
import { CreateInteractionDto } from '../dtos/create-interaction.dto';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('interaction')
export class InteractionController {
  constructor(private readonly interactionService: InteractionService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.BUYER)
  @Post()
  async record(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateInteractionDto,
  ) {
    const interaction = await this.interactionService.recordInteraction(
      user.id,
      dto,
    );

    return {
      success: true,
      message: 'Interaction recorded',
      data: { interaction },
    };
  }

  @Get('mine')
  async myInteractions(
    @CurrentUser() user: JwtUser,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.interactionService.findMine(user.id, query, baseUrl);
  }
}
