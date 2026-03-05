import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../pos/entities/order.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Product } from '../../products/entities/product.entity';
import { Expense } from '../../expense/entities/expense.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  async getSalesReport(branchId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    let query = this.orderRepository.createQueryBuilder('order')
      .where('order.status = :status', { status: 'paid' });

    if (branchId) {
      query = query.andWhere('order.branchId = :branchId', { branchId });
    }

    if (startDate) {
      query = query.andWhere('order.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query = query.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const orders = await query.getMany();
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    
    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      startDate,
      endDate,
    };
  }

  async getTopSellingProducts(branchId?: string, limit: number = 10): Promise<any[]> {
    // This is a simplified version - in a real implementation, you would join with order_items
    const products = await this.productRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    
    return products.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      // In a real implementation, you would calculate actual sales quantities
      quantitySold: Math.floor(Math.random() * 100),
    }));
  }

  async getPaymentMethodsReport(branchId?: string): Promise<any> {
    let query = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.paymentMethod', 'paymentMethod')
      .where('payment.status = :status', { status: 'completed' });

    if (branchId) {
      query = query.andWhere('payment.branchId = :branchId', { branchId });
    }

    const payments = await query.getMany();
    
    const paymentMethodsSummary: Record<string, { count: number; amount: number }> = {};
    
    payments.forEach(payment => {
      const methodName = payment.paymentMethod?.name || 'Unknown';
      if (!paymentMethodsSummary[methodName]) {
        paymentMethodsSummary[methodName] = { count: 0, amount: 0 };
      }
      paymentMethodsSummary[methodName].count += 1;
      paymentMethodsSummary[methodName].amount += payment.amount;
    });
    
    return paymentMethodsSummary;
  }

  async getDailySalesReport(days: number = 7, branchId?: string): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    let query = this.orderRepository.createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('SUM(order.totalAmount)', 'total')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.status = :status', { status: 'paid' })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC');

    if (branchId) {
      query = query.andWhere('order.branchId = :branchId', { branchId });
    }

    const results = await query.getRawMany();
    
    // Fill in missing dates with zero values
    const dailySales = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      const dateString = date.toISOString().split('T')[0];
      
      const existing = results.find(r => r.date === dateString);
      dailySales.push({
        date: dateString,
        total: existing ? parseFloat(existing.total) : 0,
        count: existing ? parseInt(existing.count) : 0,
      });
    }
    
    return dailySales;
  }

  async getProfitAndLossSummary(filters: {
    period?: 'day' | 'month' | 'year' | 'custom';
    date?: string;
    month?: string;
    year?: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
  }): Promise<any> {
    const range = this.resolveDateRange(filters);
    const { startDate, endDate } = range;

    let orderQuery = this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: 'paid' })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate });

    let expenseQuery = this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.expenseDate >= :startDate', { startDate })
      .andWhere('expense.expenseDate <= :endDate', { endDate });

    if (filters.branchId) {
      orderQuery = orderQuery.andWhere('order.branchId = :branchId', {
        branchId: filters.branchId,
      });
      expenseQuery = expenseQuery.andWhere('expense.branchId = :branchId', {
        branchId: filters.branchId,
      });
    }

    const [orders, expenses] = await Promise.all([
      orderQuery
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.createdBy', 'createdBy')
        .getMany(),
      expenseQuery.getMany(),
    ]);

    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0,
    );
    const totalExpense = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );
    const netProfit = Number((totalRevenue - totalExpense).toFixed(2));
    const profitMargin =
      totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

    const expenseByCategory: Record<string, number> = {};
    for (const expense of expenses) {
      const categoryName = expense.category?.name || 'Uncategorized';
      expenseByCategory[categoryName] =
        (expenseByCategory[categoryName] || 0) + Number(expense.amount || 0);
    }

    return {
      period: range.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      netProfit,
      profitMargin,
      totalOrders: orders.length,
      totalExpensesCount: expenses.length,
      expenseByCategory: Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({
          category,
          amount: Number(amount.toFixed(2)),
        })),
      salesTransactions: orders
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          tableNumber: order.tableNumber,
          type: order.type,
          waiterId: order.createdById,
          waiterName:
            order.takenByName ||
            `${order.createdBy?.firstName || ''} ${order.createdBy?.lastName || ''}`.trim() ||
            order.createdBy?.email ||
            'Unknown',
          totalAmount: Number(order.totalAmount || 0),
          items: (order.items || []).map((item) => ({
            name: item.productName,
            qty: Number(item.quantity || 0),
            total: Number(item.total || 0),
          })),
        })),
      expenseTransactions: expenses
        .sort(
          (a, b) =>
            new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
        )
        .map((expense) => ({
          id: expense.id,
          title: expense.title,
          category: expense.category?.name || 'Uncategorized',
          amount: Number(expense.amount || 0),
          expenseDate: expense.expenseDate,
          description: expense.description || '',
        })),
      waiterSummary: Object.values(
        orders.reduce((acc, order) => {
          const waiterId = order.createdById || 'unknown';
          const waiterName =
            order.takenByName ||
            `${order.createdBy?.firstName || ''} ${order.createdBy?.lastName || ''}`.trim() ||
            order.createdBy?.email ||
            'Unknown';

          if (!acc[waiterId]) {
            acc[waiterId] = {
              waiterId,
              waiterName,
              orderCount: 0,
              totalSales: 0,
            };
          }
          acc[waiterId].orderCount += 1;
          acc[waiterId].totalSales += Number(order.totalAmount || 0);
          return acc;
        }, {} as Record<string, { waiterId: string; waiterName: string; orderCount: number; totalSales: number }>),
      )
        .map((item) => ({
          ...item,
          totalSales: Number(item.totalSales.toFixed(2)),
          averageOrder:
            item.orderCount > 0 ? Number((item.totalSales / item.orderCount).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.totalSales - a.totalSales),
    };
  }

  private resolveDateRange(filters: {
    period?: 'day' | 'month' | 'year' | 'custom';
    date?: string;
    month?: string;
    year?: string;
    startDate?: string;
    endDate?: string;
  }): { period: 'day' | 'month' | 'year' | 'custom'; startDate: Date; endDate: Date } {
    const period = filters.period || 'day';
    const now = new Date();

    if (period === 'custom' && filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      return { period, startDate, endDate };
    }

    if (period === 'day') {
      const target = filters.date ? new Date(filters.date) : now;
      const startDate = new Date(target);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(target);
      endDate.setHours(23, 59, 59, 999);
      return { period, startDate, endDate };
    }

    if (period === 'month') {
      const base = filters.month ? new Date(`${filters.month}-01`) : now;
      const startDate = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
      const endDate = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
      return { period, startDate, endDate };
    }

    const yearValue = Number(filters.year || now.getFullYear());
    const startDate = new Date(yearValue, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(yearValue, 11, 31, 23, 59, 59, 999);
    return { period: 'year', startDate, endDate };
  }
}
