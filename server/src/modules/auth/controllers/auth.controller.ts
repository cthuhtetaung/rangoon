import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  private setSessionCookies(res: Response, accessToken: string, refreshToken: string) {
    const opts = this.getCookieOptions();
    res.cookie('access_token', accessToken, {
      ...opts,
      maxAge: 30 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      ...opts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearSessionCookies(res: Response) {
    const opts = this.getCookieOptions();
    res.clearCookie('access_token', opts);
    res.clearCookie('refresh_token', opts);
  }

  private getCookieValue(req: any, key: string): string {
    const cookieHeader = String(req?.headers?.cookie || '');
    if (!cookieHeader) return '';
    const pair = cookieHeader
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith(`${key}=`));
    return pair ? decodeURIComponent(pair.slice(key.length + 1)) : '';
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const clientIp =
      req?.ip ||
      req?.headers?.['x-forwarded-for'] ||
      req?.socket?.remoteAddress ||
      'unknown';
    const result = await this.authService.login(loginDto, String(clientIp));
    this.setSessionCookies(res, result.access_token, result.refresh_token);
    return {
      user: result.user,
    };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);
    this.setSessionCookies(res, result.access_token, result.refresh_token);
    return {
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.getCookieValue(req, 'refresh_token');
    const result = await this.authService.refreshSession(refreshToken);
    this.setSessionCookies(res, result.access_token, result.refresh_token);
    return { user: result.user };
  }

  @Post('logout')
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.getCookieValue(req, 'refresh_token');
    if (refreshToken) {
      const userId = await this.authService.resolveUserIdFromRefreshToken(refreshToken);
      if (userId) await this.authService.logout(userId);
    }
    this.clearSessionCookies(res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfileGet(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription-status')
  async getSubscriptionStatus(@Request() req: any) {
    return this.authService.getSubscriptionStatus(req.user || {});
  }
}
