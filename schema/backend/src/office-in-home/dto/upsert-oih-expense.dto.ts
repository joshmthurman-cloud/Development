import { IsString, IsInt, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertOihExpenseDto {
  @ApiProperty({ example: 'Internet' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 1, description: 'Month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 85.50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}
