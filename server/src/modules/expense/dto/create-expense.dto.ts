import { IsNotEmpty, IsString, IsOptional, IsNumber, IsUUID, IsDateString } from 'class-validator';

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @IsNotEmpty()
  @IsDateString()
  expenseDate!: Date;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsNotEmpty()
  @IsUUID()
  branchId!: string;
}