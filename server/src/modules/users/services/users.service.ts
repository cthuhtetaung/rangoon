import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterDto } from '../../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(includeDeleted = false): Promise<User[]> {
    return this.usersRepository.find({
      withDeleted: includeDeleted,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email: String(email || '').trim().toLowerCase() } });
  }

  async findByEmailIncludingDeleted(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: String(email || '').trim().toLowerCase() },
      withDeleted: true,
    });
  }

  async create(userData: RegisterDto | Partial<User>): Promise<User> {
    const payload: Partial<User> = { ...(userData as Partial<User>) };
    if (typeof payload.email === 'string') {
      payload.email = payload.email.trim().toLowerCase();
    }
    if (typeof payload.password === 'string' && !payload.password.startsWith('$2')) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    const existing = payload.email ? await this.findByEmailIncludingDeleted(payload.email) : null;
    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException('Email already exists');
      }
      const restorePayload: Partial<User> = {
        ...payload,
        isActive: true,
        deletedAt: undefined,
      };
      await this.usersRepository.update(existing.id, restorePayload);
      await this.usersRepository.restore(existing.id);
      const restored = await this.findById(existing.id);
      if (!restored) {
        throw new ConflictException('Failed to restore existing account');
      }
      return restored;
    }

    const user = this.usersRepository.create(payload);
    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any).driverError?.code === '23505') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const payload: Partial<User> = { ...userData };
    if (typeof payload.password === 'string' && !payload.password.startsWith('$2')) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    await this.usersRepository.update(id, payload);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.update(id, { isActive: false });
    await this.usersRepository.softDelete(id);
  }

  async ensureDefaultAdmin(): Promise<User> {
    const email = 'admin';
    const password = 'admin123';
    const shouldResetPassword = process.env.DEFAULT_ADMIN_RESET_PASSWORD === 'true';

    const existing = await this.findByEmail(email);
    if (existing) {
      // Do not overwrite credentials on every restart.
      existing.firstName = existing.firstName || 'Super';
      existing.lastName = existing.lastName || 'Admin';
      existing.role = existing.role || 'admin';
      existing.phone = existing.phone || '-';
      existing.shopName = existing.shopName || 'Rangoon F&B';
      existing.businessPhone = existing.businessPhone || existing.phone || '-';
      existing.isActive = existing.isActive ?? true;
      existing.extraPermissions = Array.isArray(existing.extraPermissions) ? existing.extraPermissions : [];
      existing.subscriptionPlan = existing.subscriptionPlan || 'free';
      existing.subscriptionStatus = existing.subscriptionStatus || 'active';
      if (shouldResetPassword) {
        existing.password = await bcrypt.hash(password, 10);
      }
      return this.usersRepository.save(existing);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = this.usersRepository.create({
      firstName: 'Super',
      lastName: 'Admin',
      email,
      password: hashedPassword,
      role: 'admin',
      phone: '-',
      shopName: 'Rangoon F&B',
      businessPhone: '-',
      businessAddress: null,
      branchId: null as any,
      isActive: true,
      language: 'en',
      extraPermissions: [],
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      subscriptionStartAt: null,
      subscriptionEndAt: null,
    });
    return this.usersRepository.save(admin);
  }
}
