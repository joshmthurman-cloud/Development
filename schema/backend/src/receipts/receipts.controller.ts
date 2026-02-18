import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReceiptsService } from './receipts.service';
import { RequestUploadDto } from './dto/request-upload.dto';
import { AssignReceiptDto } from './dto/assign-receipt.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Receipts')
@ApiBearerAuth()
@Controller('businesses/:businessId/receipts')
export class ReceiptsController {
  constructor(private receiptsService: ReceiptsService) {}

  @Post('upload')
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Request a signed upload URL for a receipt' })
  async requestUpload(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestUploadDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.receiptsService.requestUploadUrl(businessId, user.sub, dto, correlationId);
  }

  @Post(':receiptId/confirm')
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Confirm a receipt upload is complete' })
  async confirmUpload(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @CurrentUser() user: JwtPayload,
    @CorrelationId() correlationId: string,
  ) {
    return this.receiptsService.confirmUpload(businessId, receiptId, user.sub, correlationId);
  }

  @Patch(':receiptId/assign')
  @Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Assign a receipt to a ledger entry' })
  async assign(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignReceiptDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.receiptsService.assignToEntry(businessId, receiptId, user.sub, dto, correlationId);
  }

  @Get(':receiptId/download')
  @ApiOperation({ summary: 'Get a signed download URL for a receipt' })
  async download(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ) {
    return this.receiptsService.getDownloadUrl(businessId, receiptId);
  }

  @Get()
  @ApiOperation({ summary: 'List receipts for a business' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  async findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.receiptsService.findByBusiness(
      businessId,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
    );
  }
}
