import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { LoggingService } from '../logging/logging.service';
import { RequestUploadDto } from './dto/request-upload.dto';
import { AssignReceiptDto } from './dto/assign-receipt.dto';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditService: AuditService,
    private logger: LoggingService,
  ) {}

  async requestUploadUrl(
    businessId: string,
    userId: string,
    dto: RequestUploadDto,
    correlationId: string,
  ) {
    if (!ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException(
        `File type ${dto.mimeType} is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const receiptId = uuidv4();
    const ext = dto.filename.split('.').pop() || 'bin';
    const storageKey = `${businessId}/${receiptId}.${ext}`;
    const bucket = this.storageService.getBucketName('receipts');

    const uploadUrl = await this.storageService.getSignedUploadUrl(bucket, storageKey);

    const receipt = await this.prisma.receipt.create({
      data: {
        id: receiptId,
        businessId,
        ledgerEntryId: dto.ledgerEntryId,
        originalFilename: dto.filename,
        storageKey,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        uploadedBy: userId,
      },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'receipt.upload_initiated',
      entityType: 'Receipt',
      entityId: receipt.id,
      afterState: {
        filename: dto.filename,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        ledgerEntryId: dto.ledgerEntryId,
      },
    });

    return { receiptId: receipt.id, uploadUrl, storageKey };
  }

  async confirmUpload(
    businessId: string,
    receiptId: string,
    userId: string,
    correlationId: string,
  ) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, businessId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'receipt.upload_confirmed',
      entityType: 'Receipt',
      entityId: receiptId,
      afterState: { storageKey: receipt.storageKey },
    });

    return { message: 'Upload confirmed', receiptId };
  }

  async assignToEntry(
    businessId: string,
    receiptId: string,
    userId: string,
    dto: AssignReceiptDto,
    correlationId: string,
  ) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, businessId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    const beforeState = { ledgerEntryId: receipt.ledgerEntryId };

    const updated = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: { ledgerEntryId: dto.ledgerEntryId },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'receipt.assigned',
      entityType: 'Receipt',
      entityId: receiptId,
      beforeState,
      afterState: { ledgerEntryId: dto.ledgerEntryId },
    });

    return updated;
  }

  async getDownloadUrl(businessId: string, receiptId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, businessId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    const bucket = this.storageService.getBucketName('receipts');
    const downloadUrl = await this.storageService.getSignedDownloadUrl(bucket, receipt.storageKey);

    return { receiptId, downloadUrl, filename: receipt.originalFilename };
  }

  async findByBusiness(businessId: string, skip = 0, take = 50) {
    const [receipts, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.receipt.count({ where: { businessId } }),
    ]);
    return { receipts, total, skip, take };
  }

  async findByEntry(businessId: string, ledgerEntryId: string) {
    return this.prisma.receipt.findMany({
      where: { businessId, ledgerEntryId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
