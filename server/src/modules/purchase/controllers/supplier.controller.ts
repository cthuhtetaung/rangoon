import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { SupplierService } from '../services/supplier.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

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
  create(@Body() createSupplierDto: CreateSupplierDto, @Request() req: any) {
    const branchId = this.resolveBranchScope(req, createSupplierDto.branchId);
    return this.supplierService.create({
      ...createSupplierDto,
      branchId: branchId || createSupplierDto.branchId || undefined,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findAll(@Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.supplierService.findAll(branchId);
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getActiveSuppliers(@Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.supplierService.getActiveSuppliers(branchId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.supplierService.findOne(id, branchId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Request() req: any,
  ) {
    const branchId = this.resolveBranchScope(req, updateSupplierDto.branchId);
    return this.supplierService.update(id, {
      ...updateSupplierDto,
      branchId: branchId || updateSupplierDto.branchId,
    }, branchId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.supplierService.remove(id, branchId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getSupplierStats(@Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.supplierService.getSupplierStats(branchId);
  }
}
