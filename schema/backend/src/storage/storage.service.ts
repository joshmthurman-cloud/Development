import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Minio.Client;

  constructor(
    private configService: ConfigService,
    private logger: LoggingService,
  ) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('storage.endpoint')!,
      port: this.configService.get<number>('storage.port'),
      useSSL: this.configService.get<boolean>('storage.useSSL')!,
      accessKey: this.configService.get<string>('storage.accessKey')!,
      secretKey: this.configService.get<string>('storage.secretKey')!,
    });
  }

  async onModuleInit() {
    const buckets = [
      this.configService.get<string>('storage.bucketReceipts')!,
      this.configService.get<string>('storage.bucketTemplates')!,
    ];

    for (const bucket of buckets) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket);
          this.logger.log(`Created bucket: ${bucket}`, 'StorageService');
        }
      } catch (error) {
        this.logger.warn(
          `Could not verify/create bucket "${bucket}" — storage may be unavailable`,
          'StorageService',
        );
      }
    }
  }

  async getSignedUploadUrl(
    bucket: string,
    objectName: string,
    expirySeconds?: number,
  ): Promise<string> {
    const expiry = expirySeconds || this.configService.get<number>('storage.signedUrlExpiry')!;
    return this.client.presignedPutObject(bucket, objectName, expiry);
  }

  async getSignedDownloadUrl(
    bucket: string,
    objectName: string,
    expirySeconds?: number,
  ): Promise<string> {
    const expiry = expirySeconds || this.configService.get<number>('storage.signedUrlExpiry')!;
    return this.client.presignedGetObject(bucket, objectName, expiry);
  }

  async deleteObject(bucket: string, objectName: string): Promise<void> {
    await this.client.removeObject(bucket, objectName);
  }

  async getObjectInfo(
    bucket: string,
    objectName: string,
  ): Promise<Minio.BucketItemStat> {
    return this.client.statObject(bucket, objectName);
  }

  getBucketName(type: 'receipts' | 'templates'): string {
    const key = type === 'receipts' ? 'storage.bucketReceipts' : 'storage.bucketTemplates';
    return this.configService.get<string>(key)!;
  }
}
