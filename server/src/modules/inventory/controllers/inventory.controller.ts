import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { isUUID } from 'class-validator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('add')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addStock(@Body() addStockDto: any, @Request() req: any) {
    const branchId =
      addStockDto.branchId && isUUID(addStockDto.branchId) ? addStockDto.branchId : req.user?.branchId || null;
    const createdById =
      addStockDto.createdById && isUUID(addStockDto.createdById) ? addStockDto.createdById : req.user?.id;

    return this.inventoryService.addStock(
      addStockDto.productId,
      Number(addStockDto.quantity),
      Number(addStockDto.costPrice || 0),
      branchId,
      createdById,
      addStockDto.notes,
    );
  }

  @Post('remove')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeStock(@Body() removeStockDto: any, @Request() req: any) {
    const branchId =
      removeStockDto.branchId && isUUID(removeStockDto.branchId) ? removeStockDto.branchId : req.user?.branchId || null;
    const createdById =
      removeStockDto.createdById && isUUID(removeStockDto.createdById) ? removeStockDto.createdById : req.user?.id;

    return this.inventoryService.removeStock(
      removeStockDto.productId,
      Number(removeStockDto.quantity),
      branchId,
      createdById,
      removeStockDto.notes,
    );
  }

  @Post('adjust')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async adjustStock(@Body() adjustStockDto: any, @Request() req: any) {
    const branchId =
      adjustStockDto.branchId && isUUID(adjustStockDto.branchId) ? adjustStockDto.branchId : req.user?.branchId || null;
    const createdById =
      adjustStockDto.createdById && isUUID(adjustStockDto.createdById) ? adjustStockDto.createdById : req.user?.id;

    return this.inventoryService.adjustStock(
      adjustStockDto.productId,
      Number(adjustStockDto.quantity),
      branchId,
      createdById,
      adjustStockDto.notes,
    );
  }

  @Get('history/:productId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getStockHistory(@Param('productId') productId: string) {
    return this.inventoryService.getStockHistory(productId);
  }

  @Get('current/:productId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getCurrentStock(@Param('productId') productId: string) {
    return this.inventoryService.getCurrentStock(productId);
  }
}
