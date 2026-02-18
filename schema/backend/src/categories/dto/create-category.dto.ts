import { IsString, IsEnum, IsOptional, IsUUID, IsInt, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryGroup } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Gas' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: CategoryGroup })
  @IsEnum(CategoryGroup)
  group!: CategoryGroup;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
