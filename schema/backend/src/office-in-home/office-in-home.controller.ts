import { Controller, Get, Put, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OfficeInHomeService } from './office-in-home.service';
import { UpsertOfficeInHomeDto } from './dto/upsert-office-in-home.dto';
import { UpsertOihExpenseDto } from './dto/upsert-oih-expense.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Office in Home')
@ApiBearerAuth()
@Controller('businesses/:businessId/fiscal-years/:fiscalYearId/office-in-home')
export class OfficeInHomeController {
  constructor(private oihService: OfficeInHomeService) {}

  @Put()
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Create or update Office in Home settings' })
  async upsert(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertOfficeInHomeDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.oihService.upsert(businessId, fiscalYearId, user.sub, dto, correlationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get Office in Home data with deduction calculation' })
  async get(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
  ) {
    return this.oihService.get(businessId, fiscalYearId);
  }

  @Post('expenses')
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Create or update an Office in Home expense' })
  async upsertExpense(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertOihExpenseDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.oihService.upsertExpense(businessId, fiscalYearId, user.sub, dto, correlationId);
  }
}
