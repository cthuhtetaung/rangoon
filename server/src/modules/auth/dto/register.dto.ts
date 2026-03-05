import { IsNotEmpty, IsOptional, MinLength, IsString } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  shopName!: string;

  @IsString()
  @IsOptional()
  businessPhone?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;
}
