import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { FEATURE_PERMISSIONS } from '../../../common/constants/permission.constants';

export class CreateUserByAdminDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsIn(['admin', 'owner', 'manager', 'cashier', 'waiter', 'chef', 'staff'])
  role!: 'admin' | 'owner' | 'manager' | 'cashier' | 'waiter' | 'chef' | 'staff';

  @ValidateIf((dto: CreateUserByAdminDto) => dto.role === 'owner')
  @IsString()
  @IsNotEmpty()
  shopName?: string;

  @IsString()
  @IsOptional()
  businessPhone?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(FEATURE_PERMISSIONS, { each: true })
  extraPermissions?: string[];
}
