import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertOfficeInHomeDto {
  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  officeSquareFootage?: number;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalSquareFootage?: number;
}
