import { IsNotEmpty, IsEnum, IsDateString, IsOptional, IsString, IsNumber, IsUUID, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

class CreatePurchaseItemDto {
  @IsNotEmpty()
  @IsUUID()
  productId!: string;

  @IsNotEmpty()
  @IsNumber()
  unitPrice!: number;

  @IsNotEmpty()
  @IsNumber()
  quantity!: number;

  @IsNotEmpty()
  @IsNumber()
  total!: number;
}

export class CreatePurchaseOrderDto {
  @IsNotEmpty()
  @IsEnum(PurchaseOrderStatus)
  status!: PurchaseOrderStatus;

  @IsNotEmpty()
  @IsDateString()
  orderDate!: Date;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: Date;

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsUUID()
  supplierId!: string;

  @IsNotEmpty()
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items?: CreatePurchaseItemDto[];
}