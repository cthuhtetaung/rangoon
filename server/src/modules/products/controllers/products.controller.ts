import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ProductsService } from '../services/products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async create(@Body() createDto: any, @Request() req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? createDto.branchId || req?.user?.branchId || null : req?.user?.branchId || null;
    return this.productsService.create({
      ...createDto,
      branchId,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async findAll(@Query() query: any, @Request() req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = role === 'admin' ? query.branchId : req?.user?.branchId || null;
    return this.productsService.findAll({
      ...query,
      branchId,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  async findById(@Param('id') id: string, @Request() req: any) {
    const branchId = String(req?.user?.role || '').toLowerCase() === 'admin' ? undefined : req?.user?.branchId || null;
    return this.productsService.findById(id, branchId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    const branchId = String(req?.user?.role || '').toLowerCase() === 'admin' ? undefined : req?.user?.branchId || null;
    return this.productsService.update(id, updateDto, branchId);
  }

  @Post(':id/bom')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async setBom(@Param('id') id: string, @Body('bom') bom: any[], @Request() req: any) {
    const branchId = String(req?.user?.role || '').toLowerCase() === 'admin' ? undefined : req?.user?.branchId || null;
    return this.productsService.setBom(id, bom, branchId);
  }
}
