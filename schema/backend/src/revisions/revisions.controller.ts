import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RevisionsService } from './revisions.service';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Revisions')
@ApiBearerAuth()
@Controller('businesses/:businessId/fiscal-years/:fiscalYearId/revisions')
export class RevisionsController {
  constructor(private revisionsService: RevisionsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a revision snapshot of the current ledger state' })
  async create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRevisionDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.revisionsService.createRevision(businessId, fiscalYearId, user.sub, dto, correlationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all revisions for a fiscal year' })
  async list(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
  ) {
    return this.revisionsService.listRevisions(businessId, fiscalYearId);
  }

  @Get(':revisionId')
  @ApiOperation({ summary: 'Get a revision with full snapshot data' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
  ) {
    return this.revisionsService.getRevision(businessId, fiscalYearId, revisionId);
  }

  @Post(':revisionId/rollback')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Roll back the ledger to a specific revision' })
  async rollback(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('fiscalYearId', ParseUUIDPipe) fiscalYearId: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @CurrentUser() user: JwtPayload,
    @CorrelationId() correlationId: string,
  ) {
    return this.revisionsService.rollback(businessId, fiscalYearId, revisionId, user.sub, correlationId);
  }
}
