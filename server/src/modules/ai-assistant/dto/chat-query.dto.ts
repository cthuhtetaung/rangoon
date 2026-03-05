import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  question!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  lowStockThreshold?: number;

  @IsOptional()
  @IsString()
  @IsIn(['today', 'week', 'month'])
  period?: 'today' | 'week' | 'month';
}
