import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@ApiTags('Restaurants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Create a new restaurant' })
  @ApiResponse({ status: 201, description: 'Restaurant created' })
  async create(@Body() dto: CreateRestaurantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.restaurantsService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Get all restaurants' })
  @ApiResponse({ status: 200, description: 'List of restaurants' })
  async findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.restaurantsService.findAll(query, user);
  }

  @Get('public/:uuid')
  @Public()
  @ApiOperation({ summary: 'Get restaurant public info by UUID' })
  @ApiResponse({ status: 200, description: 'Restaurant info' })
  async findByUuid(@Param('uuid') uuid: string) {
    return this.restaurantsService.findByUuid(uuid);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get restaurant by ID' })
  @ApiResponse({ status: 200, description: 'Restaurant details' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.restaurantsService.findOne(id, user);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Update restaurant' })
  @ApiResponse({ status: 200, description: 'Restaurant updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.restaurantsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Delete restaurant (soft delete)' })
  @ApiResponse({ status: 200, description: 'Restaurant deleted' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.restaurantsService.remove(id, user);
  }
}
