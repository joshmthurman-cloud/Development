import { IsString, IsInt, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestUploadDto {
  @ApiProperty({ example: 'receipt-jan-gas.pdf' })
  @IsString()
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  fileSize!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ledgerEntryId?: string;
}
