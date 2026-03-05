import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ForbiddenException, Request, Query } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { User } from '../entities/user.entity';
import { CreateUserByAdminDto } from '../dto/create-user-by-admin.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'owner')
  async findAll(
    @Request() req: any,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<Array<Omit<User, 'password'>>> {
    const requesterRole = String(req?.user?.role || '').toLowerCase();
    const withDeleted = requesterRole === 'admin' && String(includeDeleted || '').toLowerCase() === 'true';
    const users = await this.usersService.findAll(withDeleted);
    const requesterBranchId = req?.user?.branchId || null;
    const visibleUsers = users.filter((user) => {
      if (requesterRole !== 'admin' && user.branchId !== requesterBranchId) {
        return false;
      }
      if (requesterRole === 'owner' && String(user.role || '').toLowerCase() === 'admin') {
        return false;
      }
      return true;
    });
    return visibleUsers.map((user) => this.sanitizeUser(user));
  }

  @Get(':id')
  @Roles('admin', 'owner', 'manager')
  async findById(@Param('id') id: string, @Request() req: any): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findById(id);
    const requesterRole = String(req?.user?.role || '').toLowerCase();
    const requesterBranchId = req?.user?.branchId || null;
    if (user && requesterRole !== 'admin' && user.branchId !== requesterBranchId) {
      throw new ForbiddenException('Cannot access user from another workspace');
    }
    if (user && requesterRole === 'owner' && String(user.role || '').toLowerCase() === 'admin') {
      throw new ForbiddenException('Owner cannot access admin account');
    }
    return user ? this.sanitizeUser(user) : null;
  }

  @Post()
  @Roles('admin', 'owner')
  async create(@Body() userData: CreateUserByAdminDto, @Request() req: any): Promise<Omit<User, 'password'>> {
    const requester = req?.user as User | undefined;
    const requesterRole = String(requester?.role || '').toLowerCase();
    const targetRole = String(userData?.role || '').toLowerCase();

    if (requesterRole === 'owner' && targetRole === 'admin') {
      throw new ForbiddenException('Owner cannot create admin account');
    }

    const user = await this.usersService.create({
      ...userData,
      branchId: requesterRole === 'admin' ? (userData as any).branchId || requester?.branchId || null : requester?.branchId || null,
      shopName: userData.shopName || requester?.shopName || null,
      businessPhone: userData.businessPhone || requester?.businessPhone || userData.phone,
      businessAddress: userData.businessAddress || requester?.businessAddress || null,
    });
    return this.sanitizeUser(user);
  }

  @Put(':id')
  @Roles('admin', 'owner')
  async update(@Param('id') id: string, @Body() userData: Partial<User>, @Request() req: any): Promise<Omit<User, 'password'> | null> {
    const requesterRole = String(req?.user?.role || '').toLowerCase();
    const requesterBranchId = req?.user?.branchId || null;
    const target = await this.usersService.findById(id);
    if (!target) {
      return null;
    }
    if (requesterRole !== 'admin' && target.branchId !== requesterBranchId) {
      throw new ForbiddenException('Cannot update user from another workspace');
    }

    if (requesterRole === 'owner' && String(target.role || '').toLowerCase() === 'admin') {
      throw new ForbiddenException('Owner cannot update admin account');
    }
    if (requesterRole === 'owner' && String(userData.role || '').toLowerCase() === 'admin') {
      throw new ForbiddenException('Owner cannot assign admin role');
    }
    if (requesterRole !== 'admin') {
      delete (userData as any).subscriptionPlan;
      delete (userData as any).subscriptionStatus;
      delete (userData as any).subscriptionStartAt;
      delete (userData as any).subscriptionEndAt;
    }

    const user = await this.usersService.update(id, userData);
    return user ? this.sanitizeUser(user) : null;
  }

  @Put(':id/subscription')
  @Roles('admin')
  async updateSubscription(
    @Param('id') id: string,
    @Body()
    payload: {
      subscriptionPlan?: 'free' | 'monthly' | 'yearly';
      subscriptionStatus?: 'active' | 'inactive';
      subscriptionStartAt?: string | null;
      subscriptionEndAt?: string | null;
    },
  ): Promise<Omit<User, 'password'> | null> {
    const target = await this.usersService.findById(id);
    if (!target) return null;
    if (String(target.role || '').toLowerCase() !== 'owner') {
      throw new ForbiddenException('Subscription settings are only for owner accounts');
    }

    const updates: Partial<User> = {};
    if (payload.subscriptionPlan) updates.subscriptionPlan = payload.subscriptionPlan;
    if (payload.subscriptionStatus) updates.subscriptionStatus = payload.subscriptionStatus;
    if (payload.subscriptionStartAt !== undefined) {
      updates.subscriptionStartAt = payload.subscriptionStartAt ? new Date(payload.subscriptionStartAt) : null;
    }
    if (payload.subscriptionEndAt !== undefined) {
      updates.subscriptionEndAt = payload.subscriptionEndAt ? new Date(payload.subscriptionEndAt) : null;
    }
    const user = await this.usersService.update(id, updates);
    return user ? this.sanitizeUser(user) : null;
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    const requesterRole = String(req?.user?.role || '').toLowerCase();
    const requesterBranchId = req?.user?.branchId || null;
    const target = await this.usersService.findById(id);
    if (!target) {
      return;
    }
    if (requesterRole !== 'admin' && target.branchId !== requesterBranchId) {
      throw new ForbiddenException('Cannot delete user from another workspace');
    }
    if (requesterRole === 'owner' && String(target.role || '').toLowerCase() === 'admin') {
      throw new ForbiddenException('Owner cannot delete admin account');
    }
    return this.usersService.remove(id);
  }

  private sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
