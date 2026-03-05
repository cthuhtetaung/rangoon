import { IsNotEmpty, IsEnum, IsDateString, IsOptional, IsString, IsNumber, IsUUID, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PromotionType, DiscountType } from '../entities/promotion.entity';

export class CreatePromotionDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(PromotionType)
  type!: PromotionType;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  packagePrice?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate!: Date;

  @IsNotEmpty()
  @IsDateString()
  endDate!: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  buyQuantity?: number;

  @IsOptional()
  @IsNumber()
  freeQuantity?: number;

  @IsNotEmpty()
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  freeProductIds?: string[];
}