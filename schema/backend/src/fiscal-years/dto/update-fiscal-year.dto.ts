import { IsOptional, IsNumber, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFiscalYearDto {
  @ApiPropertyOptional({ example: 5449.55 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  carryover?: number;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileageDriven?: number;
}
