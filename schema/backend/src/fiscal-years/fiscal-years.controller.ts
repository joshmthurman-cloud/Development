import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FiscalYearsService } from './fiscal-years.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Fiscal Years')
@ApiBearerAuth()
@Controller('businesses/:businessId/fiscal-years')
export class FiscalYearsController {
  constructor(private fiscalYearsService: FiscalYearsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new fiscal year' })
  async create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFiscalYearDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.fiscalYearsService.create(businessId, user.sub, dto, correlationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all fiscal years for a business' })
  async findAll(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.fiscalYearsService.findAllForBusiness(businessId);
  }

  @Get(':fiscalYearId')
  @ApiOperation({ summary: 'Get a fiscal year' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
  ) {
    return this.fiscalYearsService.findById(businessId, fiscalYearId);
  }

  @Patch(':fiscalYearId')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a fiscal year' })
  async update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateFiscalYearDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.fiscalYearsService.update(businessId, fiscalYearId, user.sub, dto, correlationId);
  }
}
