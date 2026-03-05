import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { CreateExpenseCategoryDto } from '../dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoryService {
  constructor(
    @InjectRepository(ExpenseCategory)
    private expenseCategoryRepository: Repository<ExpenseCategory>,
  ) {}

  async create(createExpenseCategoryDto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    const expenseCategory = this.expenseCategoryRepository.create(createExpenseCategoryDto);
    return this.expenseCategoryRepository.save(expenseCategory);
  }

  async findAll(): Promise<ExpenseCategory[]> {
    return this.expenseCategoryRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<ExpenseCategory> {
    const expenseCategory = await this.expenseCategoryRepository.findOne({
      where: { id },
    });

    if (!expenseCategory) {
      throw new NotFoundException(`Expense category with ID ${id} not found`);
    }

    return expenseCategory;
  }

  async update(id: string, updateExpenseCategoryDto: UpdateExpenseCategoryDto): Promise<ExpenseCategory> {
    const expenseCategory = await this.findOne(id);
    Object.assign(expenseCategory, updateExpenseCategoryDto);
    return this.expenseCategoryRepository.save(expenseCategory);
  }

  async remove(id: string): Promise<void> {
    const expenseCategory = await this.findOne(id);
    await this.expenseCategoryRepository.remove(expenseCategory);
  }

  async getActiveCategories(): Promise<ExpenseCategory[]> {
    return this.expenseCategoryRepository.find({
      where: { isActive: true },
      order: {
        name: 'ASC',
      },
    });
  }

  async getCategoryStats(): Promise<any> {
    const totalCategories = await this.expenseCategoryRepository.count();
    const activeCategories = await this.expenseCategoryRepository.count({
      where: { isActive: true },
    });

    return {
      total: totalCategories,
      active: activeCategories,
    };
  }
}