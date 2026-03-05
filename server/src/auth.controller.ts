import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './modules/auth/services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() credentials: any) {
    return this.authService.login(credentials);
  }

  @Post('signup')
  async signup(@Body() data: any) {
    return this.authService.register(data);
  }
}