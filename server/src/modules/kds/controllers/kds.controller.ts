import { Controller, Get, Post, Param, Body, UseGuards, BadRequestException, Query } from '@nestjs/common';
import { KdsService } from '../services/kds.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { isUUID } from 'class-validator';

@Controller('kds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KdsController {
  constructor(private readonly kdsService: KdsService) {}

  @Get('pending/:branchId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF)
  async getPendingOrders(@Param('branchId') branchId: string) {
    return this.kdsService.getPendingOrders(this.resolveBranch(branchId));
  }

  @Get('preparing/:branchId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF)
  async getPreparingOrders(@Param('branchId') branchId: string) {
    return this.kdsService.getPreparingOrders(this.resolveBranch(branchId));
  }

  @Get('ready/:branchId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF)
  async getReadyOrders(@Param('branchId') branchId: string) {
    return this.kdsService.getReadyOrders(this.resolveBranch(branchId));
  }

  @Get('served/:branchId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF)
  async getServedOrders(
    @Param('branchId') branchId: string,
    @Query('date') date?: string,
  ) {
    return this.kdsService.getServedOrders(this.resolveBranch(branchId), date);
  }

  @Get('ready-notifications/:branchId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async getReadyNotifications(@Param('branchId') branchId: string) {
    return this.kdsService.getReadyNotifications(this.resolveBranch(branchId));
  }

  @Post('update-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF)
  async updateOrderStatus(@Body() updateStatusDto: any) {
    if (!isUUID(updateStatusDto.id)) {
      throw new BadRequestException('Invalid kitchen order id');
    }
    return this.kdsService.updateOrderStatus(
      updateStatusDto.id,
      updateStatusDto.status,
      updateStatusDto.preparedById,
    );
  }

  @Post('cancel/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF)
  async cancelOrder(@Param('id') id: string) {
    if (!isUUID(id)) {
      throw new BadRequestException('Invalid kitchen order id');
    }
    return this.kdsService.cancelOrder(id);
  }

  @Post('served/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async markAsServed(@Param('id') id: string, @Body('servedById') servedById?: string) {
    if (!isUUID(id)) {
      throw new BadRequestException('Invalid kitchen order id');
    }
    return this.kdsService.markAsServed(id, servedById);
  }

  private resolveBranch(branchId: string): string | null {
    if (branchId === 'unassigned') {
      return null;
    }
    return branchId;
  }
}
