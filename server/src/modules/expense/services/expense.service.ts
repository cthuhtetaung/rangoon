import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { ActivityLogService } from '../../activity-log/services/activity-log.service';

type ActorContext = {
  userId?: string | null;
  branchId?: string | null;
};

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(createExpenseDto: CreateExpenseDto, actor: ActorContext = {}): Promise<Expense> {
    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      branchId: createExpenseDto.branchId || actor.branchId || undefined,
      createdById: actor.userId || undefined,
    });
    const saved = await this.expenseRepository.save(expense);
    await this.activityLogService.log({
      action: 'expense.create',
      entityType: 'expense',
      entityId: saved.id,
      severity: 'info',
      branchId: saved.branchId || actor.branchId || null,
      createdById: actor.userId || null,
      details: {
        title: saved.title,
        amount: Number(saved.amount || 0),
        categoryId: saved.categoryId || null,
        expenseDate: saved.expenseDate,
      },
    });
    return saved;
  }

  async findAll(branchId?: string): Promise<Expense[]> {
    return this.expenseRepository.find({
      where: branchId ? { branchId } : {},
      order: {
        expenseDate: 'DESC',
      },
    });
  }

  async findOne(id: string, branchId?: string): Promise<Expense> {
    const where: any = { id };
    if (branchId) where.branchId = branchId;
    const expense = await this.expenseRepository.findOne({
      where,
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto, actor: ActorContext = {}): Promise<Expense> {
    const expense = await this.findOne(id, actor.branchId || undefined);
    const before = {
      title: expense.title,
      amount: Number(expense.amount || 0),
      categoryId: expense.categoryId || null,
      expenseDate: expense.expenseDate,
      description: expense.description || null,
    };
    Object.assign(expense, updateExpenseDto);
    const saved = await this.expenseRepository.save(expense);
    await this.activityLogService.log({
      action: 'expense.update',
      entityType: 'expense',
      entityId: saved.id,
      severity: 'info',
      branchId: saved.branchId || actor.branchId || null,
      createdById: actor.userId || null,
      details: {
        before,
        after: {
          title: saved.title,
          amount: Number(saved.amount || 0),
          categoryId: saved.categoryId || null,
          expenseDate: saved.expenseDate,
          description: saved.description || null,
        },
      },
    });
    return saved;
  }

  async remove(id: string, actor: ActorContext = {}): Promise<void> {
    const expense = await this.findOne(id, actor.branchId || undefined);
    await this.expenseRepository.remove(expense);
    await this.activityLogService.log({
      action: 'expense.delete',
      entityType: 'expense',
      entityId: id,
      severity: 'warning',
      branchId: expense.branchId || actor.branchId || null,
      createdById: actor.userId || null,
      details: {
        title: expense.title,
        amount: Number(expense.amount || 0),
      },
    });
  }

  async getExpensesByBranch(branchId: string): Promise<Expense[]> {
    return this.expenseRepository.find({
      where: { branchId },
      order: {
        expenseDate: 'DESC',
      },
    });
  }

  async getExpensesByCategory(categoryId: string, branchId?: string): Promise<Expense[]> {
    return this.expenseRepository.find({
      where: branchId ? { categoryId, branchId } : { categoryId },
      order: {
        expenseDate: 'DESC',
      },
    });
  }

  async getExpensesByDateRange(
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ): Promise<Expense[]> {
    const where: any = {
      expenseDate: Between(startDate, endDate),
    };
    if (branchId) where.branchId = branchId;
    return this.expenseRepository.find({
      where,
      order: {
        expenseDate: 'DESC',
      },
    });
  }

  async getExpensesByBranchAndDateRange(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Expense[]> {
    return this.expenseRepository.find({
      where: {
        branchId,
        expenseDate: Between(startDate, endDate),
      },
      order: {
        expenseDate: 'DESC',
      },
    });
  }

  async getTotalExpenses(): Promise<number> {
    const result = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async getTotalExpensesByBranch(branchId: string): Promise<number> {
    const result = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.branchId = :branchId', { branchId })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async getTotalExpensesByCategory(categoryId: string): Promise<number> {
    const result = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.categoryId = :categoryId', { categoryId })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async getExpenseStats(branchId?: string): Promise<any> {
    const totalExpenses = await this.expenseRepository.count({
      where: branchId ? { branchId } : {},
    });

    // Calculate total expense amount
    let totalAmountQuery = this.expenseRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total');
    if (branchId) {
      totalAmountQuery = totalAmountQuery.where('expense.branchId = :branchId', { branchId });
    }
    const totalAmountResult = await totalAmountQuery.getRawOne();
    
    const totalAmount = parseFloat(totalAmountResult.total) || 0;

    return {
      total: totalExpenses,
      totalAmount,
    };
  }
}
