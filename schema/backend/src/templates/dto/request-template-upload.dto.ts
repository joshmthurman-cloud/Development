import { IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestTemplateUploadDto {
  @ApiProperty({ example: 'Annual income_expenses.xlsx' })
  @IsString()
  filename!: string;

  @ApiProperty({ example: 10485760, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  fileSize!: number;
}
