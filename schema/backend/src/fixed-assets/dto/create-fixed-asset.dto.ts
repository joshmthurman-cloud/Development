import { IsString, IsNumber, IsDateString, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFixedAssetDto {
  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  purchaseDate!: string;

  @ApiProperty({ example: 'Rainbow Combo' })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 2000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amountPaid!: number;
}
