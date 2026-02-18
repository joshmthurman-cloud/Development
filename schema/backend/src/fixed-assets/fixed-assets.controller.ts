import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FixedAssetsService } from './fixed-assets.service';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Fixed Assets')
@ApiBearerAuth()
@Controller('businesses/:businessId/fiscal-years/:fiscalYearId/fixed-assets')
export class FixedAssetsController {
  constructor(private fixedAssetsService: FixedAssetsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Record a fixed asset purchase' })
  async create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFixedAssetDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.fixedAssetsService.create(businessId, fiscalYearId, user.sub, dto, correlationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all fixed assets for a fiscal year' })
  async findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
  ) {
    return this.fixedAssetsService.findAll(businessId, fiscalYearId);
  }

  @Get(':assetId')
  @ApiOperation({ summary: 'Get a fixed asset by ID' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.fixedAssetsService.findById(businessId, fiscalYearId, assetId);
  }

  @Delete(':assetId')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a fixed asset' })
  async delete(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @CurrentUser() user: JwtPayload,
    @CorrelationId() correlationId: string,
  ) {
    return this.fixedAssetsService.delete(businessId, fiscalYearId, assetId, user.sub, correlationId);
  }
}
