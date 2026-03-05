import { ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../../users/services/users.service';
import { PlatformSettingsService } from '../../platform-settings/services/platform-settings.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Injectable()
export class AuthService {
  private readonly failedAttempts = new Map<string, number[]>();
  private readonly blockedUntil = new Map<string, number>();
  private readonly loginWindowMs = 10 * 60 * 1000; // 10 minutes
  private readonly maxFailedAttempts = 5;
  private readonly blockDurationMs = 15 * 60 * 1000; // 15 minutes
  private readonly accessTokenTtl = process.env.JWT_ACCESS_EXPIRES_IN || '30m';
  private readonly refreshTokenTtl = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  constructor(
    private usersService: UsersService,
    private platformSettingsService: PlatformSettingsService,
    private jwtService: JwtService,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
  ) {}

  private toSessionUser(user: Omit<User, 'password'>) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      language: user.language,
      extraPermissions: Array.isArray(user.extraPermissions) ? user.extraPermissions : [],
      phone: user.phone,
      shopName: user.shopName,
      businessPhone: user.businessPhone,
      businessAddress: user.businessAddress,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartAt: user.subscriptionStartAt,
      subscriptionEndAt: user.subscriptionEndAt,
    };
  }

  async getSubscriptionStatus(userLike: Partial<User>) {
    const mode = await this.platformSettingsService.getSubscriptionMode();
    const role = String(userLike.role || '').toLowerCase();
    const plan = String(userLike.subscriptionPlan || 'free').toLowerCase();
    const status = String(userLike.subscriptionStatus || 'inactive').toLowerCase();
    const endAt = userLike.subscriptionEndAt ? new Date(userLike.subscriptionEndAt).getTime() : null;
    const expired = typeof endAt === 'number' && Number.isFinite(endAt) && endAt < Date.now();
    const paidPlan = plan === 'monthly' || plan === 'yearly';
    const blocked = mode === 'subscription' && role !== 'admin' && (!paidPlan || status !== 'active' || expired);
    return {
      mode,
      blocked,
      plan,
      status,
      subscriptionStartAt: userLike.subscriptionStartAt || null,
      subscriptionEndAt: userLike.subscriptionEndAt || null,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.isActive && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  private getAttemptKey(email: string, clientIp?: string): string {
    return `${String(clientIp || 'unknown')}::${String(email || '').trim().toLowerCase()}`;
  }

  private enforceLoginRateLimit(key: string): void {
    const now = Date.now();
    const blocked = this.blockedUntil.get(key);
    if (blocked && blocked > now) {
      const retrySeconds = Math.ceil((blocked - now) / 1000);
      throw new HttpException(`Too many failed attempts. Try again in ${retrySeconds}s`, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (blocked && blocked <= now) {
      this.blockedUntil.delete(key);
    }
  }

  private registerFailedAttempt(key: string): void {
    const now = Date.now();
    const windowStart = now - this.loginWindowMs;
    const existing = (this.failedAttempts.get(key) || []).filter((ts) => ts >= windowStart);
    existing.push(now);
    this.failedAttempts.set(key, existing);
    if (existing.length >= this.maxFailedAttempts) {
      this.blockedUntil.set(key, now + this.blockDurationMs);
      this.failedAttempts.delete(key);
    }
  }

  private clearFailedAttempts(key: string): void {
    this.failedAttempts.delete(key);
    this.blockedUntil.delete(key);
  }

  private parseDurationMs(value: string): number {
    const raw = String(value || '').trim().toLowerCase();
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    const amount = Number(match[1]);
    const unit = match[2];
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * unitMs[unit];
  }

  private async issueSessionTokens(user: Omit<User, 'password'>): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: this.accessTokenTtl as any });
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      { expiresIn: this.refreshTokenTtl as any },
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(user.id, {
      refreshTokenHash,
      refreshTokenExpiresAt: new Date(Date.now() + this.parseDurationMs(this.refreshTokenTtl)),
    });
    return { accessToken, refreshToken };
  }

  async login(loginDto: LoginDto, clientIp?: string) {
    const attemptKey = this.getAttemptKey(loginDto.email, clientIp);
    this.enforceLoginRateLimit(attemptKey);

    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      this.registerFailedAttempt(attemptKey);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.clearFailedAttempts(attemptKey);
    
    const { accessToken, refreshToken } = await this.issueSessionTokens(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.toSessionUser(user),
    };
  }

  async register(registerDto: RegisterDto) {
    const normalizedEmail = String(registerDto.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new UnauthorizedException('Email is required');
    }

    // Check if email already exists (including soft-deleted users)
    const existingUser = await this.usersService.findByEmailIncludingDeleted(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    let user!: User;
    try {
      await this.branchRepository.manager.transaction(async (manager) => {
        const branchRepo = manager.getRepository(Branch);
        const userRepo = manager.getRepository(User);

        const branch = await branchRepo.save(
          branchRepo.create({
            name: registerDto.shopName,
            address: registerDto.businessAddress || 'Owner workspace',
            phone: registerDto.businessPhone || registerDto.phone,
            tableCount: 12,
            isActive: true,
            isHeadquarters: false,
          }),
        );

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        user = await userRepo.save(
          userRepo.create({
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'owner',
            phone: registerDto.phone,
            shopName: registerDto.shopName,
            businessPhone: registerDto.businessPhone || registerDto.phone,
            businessAddress: registerDto.businessAddress || null,
            branchId: branch.id,
          }),
        );
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }

    const safeUser = { ...user } as Omit<User, 'password'>;
    const { accessToken, refreshToken } = await this.issueSessionTokens(safeUser);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.toSessionUser(safeUser),
    };
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload?.type !== 'refresh' || !payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt || new Date(user.refreshTokenExpiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const { password, ...safeUser } = user;
    const { accessToken, refreshToken: nextRefreshToken } = await this.issueSessionTokens(safeUser);

    return {
      access_token: accessToken,
      refresh_token: nextRefreshToken,
      user: this.toSessionUser(safeUser),
    };
  }

  async resolveUserIdFromRefreshToken(refreshToken: string): Promise<string | null> {
    if (!refreshToken) return null;
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      return null;
    }
    if (payload?.type !== 'refresh' || !payload?.sub) {
      return null;
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      return null;
    }
    if (new Date(user.refreshTokenExpiresAt).getTime() < Date.now()) {
      return null;
    }
    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    return matches ? user.id : null;
  }

  async logout(userId: string) {
    await this.usersService.update(userId, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    const { password, ...result } = user;
    return result;
  }
}
