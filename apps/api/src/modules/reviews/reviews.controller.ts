import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async create(@Body() dto: CreateReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.create(dto, user.id);
  }

  @Get('restaurant/:restaurantId')
  @Public()
  @ApiOperation({ summary: 'Get all reviews for a restaurant' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  async findAll(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query() query: PaginationDto & { rating?: number },
  ) {
    return this.reviewsService.findAll(restaurantId, query);
  }

  @Get('restaurant/:restaurantId/stats')
  @Public()
  @ApiOperation({ summary: 'Get review statistics' })
  @ApiResponse({ status: 200, description: 'Review statistics' })
  async getStats(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.reviewsService.getStats(restaurantId);
  }

  @Patch(':id/reply')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reply to a review' })
  @ApiResponse({ status: 200, description: 'Reply added' })
  async reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.reply(id, dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete review (soft delete)' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.remove(id, user.restaurantId!);
  }
}
