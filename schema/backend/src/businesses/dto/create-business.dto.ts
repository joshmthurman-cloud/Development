import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusinessDto {
  @ApiProperty({ example: 'My Landscaping Co' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}
