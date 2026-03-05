import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { PlatformSettingsService } from '../../platform-settings/services/platform-settings.service';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  branchId: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private static readonly SUBSCRIPTION_BYPASS_PREFIXES = [
    '/auth/profile',
    '/auth/refresh',
    '/auth/subscription-status',
    '/subscription-requests',
  ];

  private static cookieTokenExtractor(req: any): string | null {
    const cookieHeader = String(req?.headers?.cookie || '');
    if (!cookieHeader) return null;
    const pair = cookieHeader
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith('access_token='));
    if (!pair) return null;
    return decodeURIComponent(pair.slice('access_token='.length));
  }
  
  constructor(
    private usersService: UsersService,
    private platformSettingsService: PlatformSettingsService,
  ) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.cookieTokenExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'my-very-secure-secret-key-for-development-2025',
    });
  }

  private shouldBypassSubscriptionEnforcement(req: any): boolean {
    const path = String(req?.originalUrl || req?.url || '').toLowerCase();
    return JwtStrategy.SUBSCRIPTION_BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix));
  }

  async validate(req: any, payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      this.logger.warn(`User not found for token subject: ${payload.sub}`);
      throw new UnauthorizedException('Invalid token');
    }
    if (!user.isActive) {
      this.logger.warn(`Inactive user token rejected: ${payload.sub}`);
      throw new UnauthorizedException('User is inactive');
    }

    const mode = await this.platformSettingsService.getSubscriptionMode();
    if (
      mode === 'subscription' &&
      String(user.role || '').toLowerCase() !== 'admin' &&
      !this.shouldBypassSubscriptionEnforcement(req)
    ) {
      const plan = String(user.subscriptionPlan || 'free').toLowerCase();
      const status = String(user.subscriptionStatus || 'inactive').toLowerCase();
      const endAt = user.subscriptionEndAt ? new Date(user.subscriptionEndAt).getTime() : null;
      const expired = typeof endAt === 'number' && Number.isFinite(endAt) && endAt < Date.now();
      const paidPlan = plan === 'monthly' || plan === 'yearly';

      if (!paidPlan || status !== 'active' || expired) {
        throw new UnauthorizedException('Subscription required. Contact platform admin.');
      }
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }
}
