import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('businesses/:businessId/categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Create a category' })
  async create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCategoryDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.categoriesService.create(businessId, user.sub, dto, correlationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all categories for a business' })
  async findAll(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.categoriesService.findAllForBusiness(businessId);
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Get a category by ID' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ) {
    return this.categoriesService.findById(businessId, categoryId);
  }

  @Patch(':categoryId')
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCategoryDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.categoriesService.update(businessId, categoryId, user.sub, dto, correlationId);
  }

  @Post('seed')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Seed default categories from Excel template' })
  async seedDefaults(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @CorrelationId() correlationId: string,
  ) {
    return this.categoriesService.seedDefaultCategories(businessId, user.sub, correlationId);
  }
}
