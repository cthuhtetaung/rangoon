import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { StaffService } from '../services/staff.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles('admin', 'manager')
  async create(@Body() createStaffDto: any) {
    return this.staffService.create(createStaffDto);
  }

  @Get()
  @Roles('admin', 'manager')
  async findAll() {
    return this.staffService.findAll();
  }

  @Get('active')
  @Roles('admin', 'manager')
  async getActiveStaff() {
    return this.staffService.getActiveStaff();
  }

  @Get('branch/:branchId')
  @Roles('admin', 'manager')
  async getStaffByBranch(@Param('branchId') branchId: string) {
    return this.staffService.getStaffByBranch(branchId);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  async findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  async update(@Param('id') id: string, @Body() updateStaffDto: any) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }

  // Commission endpoints
  @Post('commission')
  @Roles('admin', 'manager')
  async addCommission(@Body() commissionData: any) {
    return this.staffService.addCommission(commissionData);
  }

  @Get('commission/staff/:staffId')
  @Roles('admin', 'manager')
  async getCommissionsByStaff(@Param('staffId') staffId: string) {
    return this.staffService.getCommissionsByStaff(staffId);
  }

  @Get('commission/branch/:branchId')
  @Roles('admin', 'manager')
  async getCommissionsByBranch(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.staffService.getCommissionsByBranch(branchId, start, end);
  }

  @Get('commission/total/:staffId')
  @Roles('admin', 'manager')
  async calculateTotalCommission(@Param('staffId') staffId: string) {
    return this.staffService.calculateTotalCommission(staffId);
  }
}