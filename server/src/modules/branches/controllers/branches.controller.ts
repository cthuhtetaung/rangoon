import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { BranchesService } from '../services/branches.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles('admin', 'owner')
  async create(@Body() createBranchDto: any) {
    return this.branchesService.create(createBranchDto);
  }

  @Get()
  @Roles('admin', 'owner', 'manager', 'cashier', 'waiter', 'chef', 'staff')
  async findAll(@Request() req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = req?.user?.branchId || null;
    const branches = await this.branchesService.findAll();
    if (role === 'admin') {
      return branches;
    }
    return branches.filter((branch) => branch.id === branchId);
  }

  @Get('active')
  @Roles('admin', 'owner', 'manager', 'cashier', 'waiter', 'chef', 'staff')
  async getActiveBranches(@Request() req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    const branchId = req?.user?.branchId || null;
    const branches = await this.branchesService.getActiveBranches();
    if (role === 'admin') {
      return branches;
    }
    return branches.filter((branch) => branch.id === branchId);
  }

  @Get(':id')
  @Roles('admin', 'owner', 'manager', 'cashier', 'waiter', 'chef', 'staff')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'admin' && req?.user?.branchId !== id) {
      return null;
    }
    return this.branchesService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'owner')
  async update(@Param('id') id: string, @Body() updateBranchDto: any) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  async remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }

  @Post(':id/headquarters')
  @Roles('admin', 'owner')
  async setHeadquarters(@Param('id') id: string) {
    return this.branchesService.setHeadquarters(id);
  }
}
