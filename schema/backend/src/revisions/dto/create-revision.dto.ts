import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRevisionDto {
  @ApiPropertyOptional({ example: 'End of month snapshot' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
