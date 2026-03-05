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
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ExpenseService } from '../services/expense.service';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  create(@Body() createExpenseDto: CreateExpenseDto, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req, createExpenseDto.branchId);
    return this.expenseService.create(createExpenseDto, {
      userId: req?.user?.id || null,
      branchId: scopedBranchId || req?.user?.branchId || null,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findAll(@Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req);
    return this.expenseService.findAll(scopedBranchId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req);
    return this.expenseService.findOne(id, scopedBranchId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Request() req: any,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, updateExpenseDto.branchId);
    return this.expenseService.update(id, updateExpenseDto, {
      userId: req?.user?.id || null,
      branchId: scopedBranchId || req?.user?.branchId || null,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req);
    return this.expenseService.remove(id, {
      userId: req?.user?.id || null,
      branchId: scopedBranchId || req?.user?.branchId || null,
    });
  }

  @Get('branch/:branchId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getExpensesByBranch(@Param('branchId', ParseUUIDPipe) branchId: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.expenseService.getExpensesByBranch(scopedBranchId || branchId);
  }

  @Get('category/:categoryId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getExpensesByCategory(@Param('categoryId', ParseUUIDPipe) categoryId: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req);
    return this.expenseService.getExpensesByCategory(categoryId, scopedBranchId);
  }

  @Get('date-range')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getExpensesByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const scopedBranchId = this.resolveBranchScope(req);
    return this.expenseService.getExpensesByDateRange(
      new Date(startDate),
      new Date(endDate),
      scopedBranchId,
    );
  }

  @Get('branch/:branchId/date-range')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getExpensesByBranchAndDateRange(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.expenseService.getExpensesByBranchAndDateRange(
      scopedBranchId || branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getExpenseStats(@Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req);
    return this.expenseService.getExpenseStats(scopedBranchId);
  }
}
