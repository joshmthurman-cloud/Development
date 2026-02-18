import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { LoggingService } from '../logging/logging.service';
import { RequestTemplateUploadDto } from './dto/request-template-upload.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditService: AuditService,
    private logger: LoggingService,
  ) {}

  async requestUploadUrl(
    businessId: string,
    userId: string,
    dto: RequestTemplateUploadDto,
    correlationId: string,
  ) {
    const templateId = uuidv4();
    const storageKey = `${businessId}/templates/${templateId}.xlsx`;
    const bucket = this.storageService.getBucketName('templates');

    const uploadUrl = await this.storageService.getSignedUploadUrl(bucket, storageKey);

    const template = await this.prisma.template.create({
      data: {
        id: templateId,
        businessId,
        originalFilename: dto.filename,
        storageKey,
        parsedSchema: {},
        uploadedBy: userId,
      },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'template.upload_initiated',
      entityType: 'Template',
      entityId: template.id,
      afterState: { filename: dto.filename, fileSize: dto.fileSize },
    });

    return { templateId: template.id, uploadUrl, storageKey };
  }

  async findByBusiness(businessId: string) {
    return this.prisma.template.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalFilename: true,
        parsedSchema: true,
        createdAt: true,
        uploadedBy: true,
      },
    });
  }

  async findById(businessId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, businessId },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async getDownloadUrl(businessId: string, templateId: string) {
    const template = await this.findById(businessId, templateId);
    const bucket = this.storageService.getBucketName('templates');
    const downloadUrl = await this.storageService.getSignedDownloadUrl(bucket, template.storageKey);
    return { templateId, downloadUrl, filename: template.originalFilename };
  }
}
