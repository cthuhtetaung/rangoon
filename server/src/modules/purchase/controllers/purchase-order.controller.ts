import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  private resolveBranchScope(req: any, requestedBranchId?: string): string | undefined {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role === UserRole.ADMIN) {
      return requestedBranchId;
    }
    const requesterBranchId = req?.user?.branchId || null;
    if (!requesterBranchId) {
      throw new ForbiddenException('Branch is required for this account');
    }
    if (requestedBranchId && requestedBranchId !== requesterBranchId) {
      throw new ForbiddenException('Cannot access another branch');
    }
    return requesterBranchId;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createPurchaseOrderDto: CreatePurchaseOrderDto, @Request() req: any) {
    const branchId = this.resolveBranchScope(req, createPurchaseOrderDto.branchId);
    return this.purchaseOrderService.create({
      ...createPurchaseOrderDto,
      branchId: branchId || createPurchaseOrderDto.branchId,
      createdById: req?.user?.id,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findAll(@Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.purchaseOrderService.findAll(branchId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.purchaseOrderService.findOne(id, branchId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    @Request() req: any,
  ) {
    const branchId = this.resolveBranchScope(req, updatePurchaseOrderDto.branchId);
    return this.purchaseOrderService.update(id, {
      ...updatePurchaseOrderDto,
      branchId: branchId || updatePurchaseOrderDto.branchId,
    }, branchId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.purchaseOrderService.remove(id, branchId);
  }

  @Get('status/:status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getPurchaseOrdersByStatus(@Param('status') status: PurchaseOrderStatus, @Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.purchaseOrderService.getPurchaseOrdersByStatus(status, branchId);
  }

  @Get('date-range')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getPurchaseOrdersByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const branchId = this.resolveBranchScope(req);
    return this.purchaseOrderService.getPurchaseOrdersByDateRange(
      new Date(startDate),
      new Date(endDate),
      branchId,
    );
  }

  @Patch(':id/receive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  receivePurchaseOrder(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.purchaseOrderService.receivePurchaseOrder(id, branchId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getPurchaseOrderStats(@Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.purchaseOrderService.getPurchaseOrderStats(branchId);
  }
}
