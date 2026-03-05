import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../pos/entities/order.entity';
import { OrderItem } from '../../pos/entities/order-item.entity';
import { Product } from '../../products/entities/product.entity';
import { Expense } from '../../expense/entities/expense.entity';

type AskQuestionInput = {
  question: string;
  branchId?: string;
  requestedByUserId?: string;
  requestedByRole?: string;
  lowStockThreshold?: number;
  period?: 'today' | 'week' | 'month';
};

type InsightData = {
  periodLabel: 'today' | 'week' | 'month';
  period: {
    start: string;
    end: string;
  };
  branchId: string | null;
  todayRevenue: number;
  paidOrderCount: number;
  avgOrderValue: number;
  todayExpense: number;
  expenseCount: number;
  netToday: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
  }>;
  outOfStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
  }>;
  generatedAt: string;
};

type MetricKey = 'sales' | 'expense' | 'top_products' | 'stock' | 'net' | 'orders' | 'avg';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly defaultLowStockThreshold = 10;
  private readonly openAiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  async askQuestion(input: AskQuestionInput): Promise<{
    answer: string;
    source: 'openai' | 'local';
    intent: string;
    insights: InsightData;
  }> {
    const periodLabel = input.period || this.detectPeriod(input.question);
    const todayRange = this.resolveRange(periodLabel);
    const insights = await this.buildInsights({
      branchId: input.branchId,
      startDate: todayRange.start,
      endDate: todayRange.end,
      lowStockThreshold: input.lowStockThreshold,
      periodLabel,
    });

    const intent = this.detectIntent(input.question);
    const wantsExplanation = /explain|analysis|ဘာကြောင့်|အကြောင်းရင်း|trend|အခြေအနေ/.test(
      String(input.question || '').toLowerCase(),
    );
    const openAiAnswer = wantsExplanation
      ? await this.tryOpenAiAnswer({
          question: input.question,
          intent,
          insights,
          requestedByRole: input.requestedByRole,
        })
      : null;

    return {
      answer: openAiAnswer || this.buildLocalAnswer(input.question, insights),
      source: openAiAnswer ? 'openai' : 'local',
      intent,
      insights,
    };
  }

  private resolveRange(period: 'today' | 'week' | 'month'): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now);

    if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    if (period === 'week') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }

    start.setHours(0, 0, 0, 0);

    return { start, end };
  }

  private async buildInsights(args: {
    branchId?: string;
    startDate: Date;
    endDate: Date;
    lowStockThreshold?: number;
    periodLabel: 'today' | 'week' | 'month';
  }): Promise<InsightData> {
    const threshold = args.lowStockThreshold || this.defaultLowStockThreshold;

    let orderQuery = this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: 'paid' })
      .andWhere('order.createdAt >= :startDate', { startDate: args.startDate })
      .andWhere('order.createdAt <= :endDate', { endDate: args.endDate });

    let expenseQuery = this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.expenseDate >= :startDate', { startDate: args.startDate })
      .andWhere('expense.expenseDate <= :endDate', { endDate: args.endDate });

    let topSellingQuery = this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin(Order, 'order', 'order.id = item.orderId')
      .select('item.productId', 'productId')
      .addSelect('item.productName', 'productName')
      .addSelect('SUM(item.quantity)', 'quantity')
      .addSelect('SUM(item.total)', 'revenue')
      .where('order.status = :status', { status: 'paid' })
      .andWhere('order.createdAt >= :startDate', { startDate: args.startDate })
      .andWhere('order.createdAt <= :endDate', { endDate: args.endDate })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(5);

    let lowStockQuery = this.productRepository
      .createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.stockQuantity <= :threshold', { threshold })
      .orderBy('product.stockQuantity', 'ASC')
      .addOrderBy('product.updatedAt', 'DESC')
      .limit(20);

    if (args.branchId) {
      orderQuery = orderQuery.andWhere('order.branchId = :branchId', { branchId: args.branchId });
      expenseQuery = expenseQuery.andWhere('expense.branchId = :branchId', { branchId: args.branchId });
      topSellingQuery = topSellingQuery.andWhere('order.branchId = :branchId', { branchId: args.branchId });
      lowStockQuery = lowStockQuery.andWhere('product.branchId = :branchId', { branchId: args.branchId });
    }

    const [paidOrders, expenses, topSellingRaw, lowStockProducts] = await Promise.all([
      orderQuery.getMany(),
      expenseQuery.getMany(),
      topSellingQuery.getRawMany<{ productId: string; productName: string; quantity: string; revenue: string }>(),
      lowStockQuery.getMany(),
    ]);

    const todayRevenue = paidOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const todayExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const paidOrderCount = paidOrders.length;

    const topSellingProducts = topSellingRaw.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      quantity: Number(row.quantity || 0),
      revenue: Number(row.revenue || 0),
    }));

    const outOfStockProducts = lowStockProducts
      .filter((item) => Number(item.stockQuantity || 0) <= 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
      }));

    return {
      periodLabel: args.periodLabel,
      period: {
        start: args.startDate.toISOString(),
        end: args.endDate.toISOString(),
      },
      branchId: args.branchId || null,
      todayRevenue: Number(todayRevenue.toFixed(2)),
      paidOrderCount,
      avgOrderValue: paidOrderCount > 0 ? Number((todayRevenue / paidOrderCount).toFixed(2)) : 0,
      todayExpense: Number(todayExpense.toFixed(2)),
      expenseCount: expenses.length,
      netToday: Number((todayRevenue - todayExpense).toFixed(2)),
      topSellingProducts,
      lowStockProducts: lowStockProducts.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        stockQuantity: Number(item.stockQuantity || 0),
      })),
      outOfStockProducts,
      generatedAt: new Date().toISOString(),
    };
  }

  private detectIntent(question: string): string {
    const metrics = this.detectRequestedMetrics(question);
    return metrics[0] || 'overview';
  }

  private detectPeriod(question: string): 'today' | 'week' | 'month' {
    const q = String(question || '').toLowerCase();
    if (/this month|monthly|လစဉ်|ဒီလ/.test(q)) return 'month';
    if (/this week|weekly|အပတ်|ဒီပတ်/.test(q)) return 'week';
    return 'today';
  }

  private detectRequestedMetrics(question: string): MetricKey[] {
    const q = String(question || '').toLowerCase();
    const metrics: MetricKey[] = [];
    const add = (key: MetricKey) => {
      if (!metrics.includes(key)) metrics.push(key);
    };

    const wantsSummary =
      /summary|overview|business summary|status/.test(q) ||
      /အစုံ|အကုန်|တစ်ခုပြ|အခြေအနေ|ဘယ်လိုနေလဲ|ဘာဖြစ်နေလဲ|စုစုပေါင်း/.test(q);
    if (wantsSummary) {
      return ['sales', 'expense', 'net', 'orders', 'top_products', 'stock'];
    }

    if (/sale|sales|revenue|ဝင်ငွေ|ရောင်းအား|ရောင်းရ/.test(q)) add('sales');
    if (/expense|အသုံးစရိတ်|အသုံး|စရိတ်|ကုန်ကျ|spend|cost/.test(q)) add('expense');
    if (/net|profit|အမြတ်/.test(q)) add('net');
    if (/order|orders|အော်ဒါ/.test(q)) add('orders');
    if (/average|avg|ticket|ပျမ်းမျှ/.test(q)) add('avg');
    if (/top|best|selling|best seller|top selling|ရောင်းကောင်း|အရောင်းကောင်း|ဘာ.*ရောင်း.*ကောင်း/.test(q)) add('top_products');
    if (/low stock|out of stock|inventory|stock|နည်းနေ|ကုန်တော့|ပစ္စည်း.*(နည်း|ကျန်|ကုန်)/.test(q)) add('stock');

    // Vague "ဘာ...?" questions should not default to only sales.
    if (metrics.length === 0 && /ဘာ|ဘယ်လို|ဘယ်လောက်/.test(q)) {
      return ['sales', 'expense', 'net', 'orders'];
    }

    return metrics.length > 0 ? metrics : ['sales'];
  }

  private buildLocalAnswer(question: string, insights: InsightData): string {
    const mmk = (value: number) => `${value.toLocaleString()} MMK`;
    const periodName = insights.periodLabel === 'today' ? 'ဒီနေ့' : insights.periodLabel === 'week' ? 'ဒီပတ် (7 days)' : 'ဒီလ';
    const requested = this.detectRequestedMetrics(question);
    const lines: string[] = [];

    for (const metric of requested) {
      if (metric === 'sales') {
        lines.push(`${periodName} ရောင်းအား: ${mmk(insights.todayRevenue)}`);
      } else if (metric === 'expense') {
        lines.push(`${periodName} အသုံးစရိတ်: ${mmk(insights.todayExpense)} (${insights.expenseCount} records)`);
      } else if (metric === 'net') {
        lines.push(`${periodName} Net: ${mmk(insights.netToday)}`);
      } else if (metric === 'orders') {
        lines.push(`${periodName} Paid orders: ${insights.paidOrderCount} ခု`);
      } else if (metric === 'avg') {
        lines.push(`${periodName} Average ticket: ${mmk(insights.avgOrderValue)}`);
      } else if (metric === 'top_products') {
        const topList = insights.topSellingProducts
          .slice(0, 5)
          .map((item, index) => `${index + 1}. ${item.productName} (${item.quantity} pcs)`)
          .join('\n');
        lines.push(
          topList ? `${periodName} ရောင်းကောင်းဆုံးပစ္စည်းများ:\n${topList}` : `${periodName} top-selling product data မရှိသေးပါ။`,
        );
      } else if (metric === 'stock') {
        const lowStock = insights.lowStockProducts
          .slice(0, 8)
          .map((item) => `- ${item.name} (${item.stockQuantity} left)`)
          .join('\n');
        lines.push(lowStock ? `Low stock ပစ္စည်းများ:\n${lowStock}` : 'Low stock ပစ္စည်းမတွေ့ပါ။');
      }
    }

    return lines.join('\n');
  }

  private async tryOpenAiAnswer(input: {
    question: string;
    intent: string;
    insights: InsightData;
    requestedByRole?: string;
  }): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.openAiModel,
          temperature: 0.2,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: 'You are an ERP business analyst for restaurant/bar operations. Answer in concise Burmese with important numbers. Never invent data. Use only provided JSON context.',
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `Question: ${input.question}\nDetected intent: ${input.intent}\nRole: ${input.requestedByRole || 'unknown'}\nContext JSON: ${JSON.stringify(input.insights)}`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const reason = await response.text();
        this.logger.warn(`OpenAI API request failed: ${response.status} ${reason}`);
        return null;
      }

      const payload = (await response.json()) as {
        output_text?: string;
      };

      const text = String(payload.output_text || '').trim();
      return text || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`OpenAI integration fallback to local model: ${message}`);
      return null;
    }
  }
}
