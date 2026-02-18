import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role, AccountType } from '@prisma/client';
import { LedgerService } from './ledger.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Ledger')
@ApiBearerAuth()
@Controller('businesses/:businessId/fiscal-years/:fiscalYearId/ledger')
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Create a new immutable ledger entry' })
  async createEntry(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLedgerEntryDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.ledgerService.createEntry(businessId, fiscalYearId, user.sub, dto, correlationId);
  }

  @Post(':entryId/reverse')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Reverse a ledger entry (immutable — creates a negating entry)' })
  async reverseEntry(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: JwtPayload,
    @CorrelationId() correlationId: string,
  ) {
    return this.ledgerService.reverseEntry(businessId, fiscalYearId, entryId, user.sub, correlationId);
  }

  @Get()
  @ApiOperation({ summary: 'Query ledger entries' })
  async findEntries(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @Query() query: LedgerQueryDto,
  ) {
    return this.ledgerService.findEntries(businessId, fiscalYearId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get income/expense summary (mirrors Excel Summary sheet)' })
  @ApiQuery({ name: 'accountType', enum: AccountType, required: false })
  async getSummary(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @Query('accountType') accountType?: AccountType,
  ) {
    return this.ledgerService.getSummary(businessId, fiscalYearId, accountType);
  }
}
