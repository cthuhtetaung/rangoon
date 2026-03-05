import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ReportsService } from '../services/reports.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getSalesReport(
    @Request() req: any,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const scopedBranchId = this.resolveBranchScope(req, branchId);

    return this.reportsService.getSalesReport(scopedBranchId, start, end);
  }

  @Get('top-products')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getTopSellingProducts(
    @Request() req: any,
    @Query('branchId') branchId?: string,
    @Query('limit') limit: number = 10,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.reportsService.getTopSellingProducts(scopedBranchId, limit);
  }

  @Get('payment-methods')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getPaymentMethodsReport(@Request() req: any, @Query('branchId') branchId?: string) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.reportsService.getPaymentMethodsReport(scopedBranchId);
  }

  @Get('daily-sales')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getDailySalesReport(
    @Request() req: any,
    @Query('days') days: number = 7,
    @Query('branchId') branchId?: string,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.reportsService.getDailySalesReport(days, scopedBranchId);
  }

  @Get('pnl')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getProfitAndLossSummary(
    @Request() req: any,
    @Query('period') period?: 'day' | 'month' | 'year' | 'custom',
    @Query('date') date?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.reportsService.getProfitAndLossSummary({
      period,
      date,
      month,
      year,
      startDate,
      endDate,
      branchId: scopedBranchId,
    });
  }
}
