import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { PosService } from '../services/pos.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { isUUID } from 'class-validator';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('orders')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async createOrder(@Body() createOrderDto: any, @Request() req: any): Promise<Order | null> {
    const branchId =
      createOrderDto.branchId && isUUID(createOrderDto.branchId) ? createOrderDto.branchId : req.user?.branchId || null;
    const createdById =
      createOrderDto.createdById && isUUID(createOrderDto.createdById) ? createOrderDto.createdById : req.user?.id;

    return this.posService.createOrder({
      ...createOrderDto,
      createdById,
      branchId,
    });
  }

  @Post('orders/save')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async saveTableOrder(@Body() saveDto: any, @Request() req: any) {
    const branchId = saveDto.branchId && isUUID(saveDto.branchId) ? saveDto.branchId : req.user?.branchId || null;
    const createdById = saveDto.createdById && isUUID(saveDto.createdById) ? saveDto.createdById : req.user?.id;

    return this.posService.saveTableOrder({
      ...saveDto,
      branchId,
      createdById,
    });
  }

  @Post('orders/:id/checkout')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async checkoutOpenOrder(@Param('id') id: string, @Body() checkoutDto: any, @Request() req: any) {
    const branchId =
      checkoutDto.branchId && isUUID(checkoutDto.branchId) ? checkoutDto.branchId : req.user?.branchId || null;
    const createdById =
      checkoutDto.createdById && isUUID(checkoutDto.createdById) ? checkoutDto.createdById : req.user?.id;

    return this.posService.checkoutOpenOrder(id, {
      ...checkoutDto,
      branchId,
      createdById,
    });
  }

  @Get('orders/open')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async getOpenOrders(@Query('tableNumber') tableNumber: string | undefined, @Request() req: any): Promise<Order[]> {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? undefined : req?.user?.branchId || null;
    return this.posService.getOpenOrders(branchId, tableNumber ? Number(tableNumber) : undefined);
  }

  @Get('tables/active')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async getActiveTables(@Request() req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? undefined : req?.user?.branchId || null;
    return this.posService.getActiveTables(branchId);
  }

  @Post('checkout')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async checkout(@Body() checkoutDto: any, @Request() req: any) {
    const branchId =
      checkoutDto.branchId && isUUID(checkoutDto.branchId) ? checkoutDto.branchId : req.user?.branchId || null;
    const createdById =
      checkoutDto.createdById && isUUID(checkoutDto.createdById) ? checkoutDto.createdById : req.user?.id;

    return this.posService.checkout({
      ...checkoutDto,
      createdById,
      branchId,
    });
  }

  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getAllOrders(@Request() req: any): Promise<Order[]> {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? undefined : req?.user?.branchId || null;
    return this.posService.getAllOrders(branchId);
  }

  @Get('orders/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async getOrderById(@Param('id') id: string, @Request() req: any): Promise<Order | null> {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? undefined : req?.user?.branchId || null;
    return this.posService.getOrderById(id, branchId);
  }

  @Get('orders/:id/receipt')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getReceipt(@Param('id') id: string, @Request() req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? undefined : req?.user?.branchId || null;
    return this.posService.getReceipt(id, branchId);
  }

  @Put('orders/:id/status')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Request() req: any,
  ): Promise<Order | null> {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? undefined : req?.user?.branchId || null;
    return this.posService.updateOrderStatus(id, status, branchId);
  }

  @Post('orders/:id/items')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async addItemToOrder(
    @Param('id') orderId: string,
    @Body() itemData: any,
    @Request() req: any,
  ): Promise<any> {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? undefined : req?.user?.branchId || null;
    return this.posService.addItemToOrder(orderId, itemData, branchId);
  }

  @Delete('items/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async removeItemFromOrder(@Param('id') itemId: string): Promise<void> {
    return this.posService.removeItemFromOrder(itemId);
  }
}
