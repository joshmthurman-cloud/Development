import { IsUUID, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class CreateLedgerEntryDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  accountType!: AccountType;

  @ApiProperty({ example: 1, description: 'Month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 150.75 })
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiPropertyOptional({ example: 'Monthly gas expense' })
  @IsOptional()
  @IsString()
  description?: string;
}
