import { IsInt, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFiscalYearDto {
  @ApiProperty({ example: 2024 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({ example: 5449.55 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  carryover?: number;
}
