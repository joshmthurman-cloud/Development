import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TemplatesService } from './templates.service';
import { RequestTemplateUploadDto } from './dto/request-template-upload.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('businesses/:businessId/templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post('upload')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Request a signed upload URL for an Excel template' })
  async requestUpload(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestTemplateUploadDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.templatesService.requestUploadUrl(businessId, user.sub, dto, correlationId);
  }

  @Get()
  @ApiOperation({ summary: 'List templates for a business' })
  async findAll(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.templatesService.findByBusiness(businessId);
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get a template by ID' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.templatesService.findById(businessId, templateId);
  }

  @Get(':templateId/download')
  @ApiOperation({ summary: 'Get a signed download URL for a template' })
  async download(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.templatesService.getDownloadUrl(businessId, templateId);
  }
}
