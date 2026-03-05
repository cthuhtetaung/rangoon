import { IsNotEmpty, MinLength, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
