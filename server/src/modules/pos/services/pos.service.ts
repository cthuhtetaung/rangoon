import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { PaymentMethod } from '../../payments/entities/payment-method.entity';
import { Product } from '../../products/entities/product.entity';
import { StockLedger, TransactionType } from '../../inventory/entities/stock-ledger.entity';
import { KitchenOrder, KitchenOrderStatus } from '../../kds/entities/kitchen-order.entity';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService } from '../../activity-log/services/activity-log.service';
import { RealtimeService } from '../../realtime/services/realtime.service';

const OPEN_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(StockLedger)
    private stockLedgerRepository: Repository<StockLedger>,
    private activityLogService: ActivityLogService,
    private realtimeService: RealtimeService,
    private dataSource: DataSource,
  ) {}

  async createOrder(createOrderDto: any): Promise<Order | null> {
    const orderNumber = `ORD-${Date.now()}`;
    const items = this.normalizeItems(createOrderDto.items);
    const takenByName = await this.resolveTakenByName(createOrderDto.createdById);

    const totals = this.calculateTotals(items, {
      taxRate: createOrderDto.taxRate,
      discountType: createOrderDto.discountType,
      discountValue: createOrderDto.discountValue,
      serviceCharge: createOrderDto.serviceCharge,
    });

    const order = this.orderRepository.create({
      orderNumber,
      status: OrderStatus.DRAFT,
      type: createOrderDto.type || 'dine_in',
      tableNumber: Number(createOrderDto.tableNumber || 0),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      discountAmount: totals.discountAmount,
      serviceCharge: totals.serviceCharge,
      notes: createOrderDto.notes,
      branchId: createOrderDto.branchId || null,
      createdById: createOrderDto.createdById,
      takenByName,
    });

    const savedOrder = await this.orderRepository.save(order);

    if (items.length > 0) {
      const itemEntities = items.map((item) =>
        this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          total: Number((item.price * item.quantity).toFixed(2)),
          notes: item.notes,
        }),
      );
      await this.orderItemRepository.save(itemEntities);
    }

    return this.getOrderById(savedOrder.id);
  }

  async saveTableOrder(saveDto: any): Promise<Order | null> {
    const tableNumber = Number(saveDto.tableNumber);
    const items = this.normalizeItems(saveDto.items);

    if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
      throw new BadRequestException('Valid table number is required');
    }

    if (!saveDto.createdById) {
      throw new BadRequestException('Missing authenticated user id');
    }

    if (items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }
    const takenByName = await this.resolveTakenByName(saveDto.createdById);

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.productRepository.findBy({ id: In(productIds) });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const normalizedBranchId =
      typeof saveDto.branchId === 'string' && saveDto.branchId.trim() ? saveDto.branchId.trim() : null;
    const openOrderWhere: any = {
      tableNumber,
      status: In(OPEN_ORDER_STATUSES),
      branchId: normalizedBranchId ? normalizedBranchId : IsNull(),
    };

    let order = await this.orderRepository.findOne({
      where: openOrderWhere,
      order: { createdAt: 'DESC' },
    });

    if (!order) {
      order = await this.orderRepository.save(
        this.orderRepository.create({
          orderNumber: `ORD-${Date.now()}`,
          status: OrderStatus.CONFIRMED,
          type: saveDto.type || 'dine_in',
          tableNumber,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          discountAmount: Number(saveDto.discountAmount || 0),
          serviceCharge: Number(saveDto.serviceCharge || 0),
          notes: saveDto.notes,
          branchId: normalizedBranchId,
          createdById: saveDto.createdById,
          takenByName,
        }),
      );
    }

    const newOrderItems = items.map((item) =>
      this.orderItemRepository.create({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        total: Number((item.price * item.quantity).toFixed(2)),
        notes: item.notes,
      }),
    );

    const savedOrderItems = await this.orderItemRepository.save(newOrderItems);

    const kitchenOrderItems = savedOrderItems.filter((item) => Boolean(productMap.get(item.productId)?.sendToKitchen));
    if (kitchenOrderItems.length > 0) {
      const kitchenOrders = kitchenOrderItems.map((item) =>
        this.dataSource.manager.create(KitchenOrder, {
          orderId: order!.id,
          orderItemId: item.id,
          itemName: item.productName,
          quantity: item.quantity,
          status: KitchenOrderStatus.PENDING,
          branchId: order!.branchId || null,
        }),
      );
      await this.dataSource.manager.save(kitchenOrders);
    }

    const fullOrder = await this.getOrderById(order.id);
    if (!fullOrder) {
      return null;
    }

    const recalculated = this.calculateTotals(fullOrder.items || [], {
      taxRate: saveDto.taxRate,
      discountType: saveDto.discountType,
      discountValue: saveDto.discountValue,
      serviceCharge: saveDto.serviceCharge ?? fullOrder.serviceCharge,
    });
    await this.orderRepository.update(order.id, {
      subtotal: recalculated.subtotal,
      taxAmount: recalculated.taxAmount,
      totalAmount: recalculated.totalAmount,
      discountAmount: recalculated.discountAmount,
      serviceCharge: recalculated.serviceCharge,
      status: OrderStatus.CONFIRMED,
    });

    const result = await this.getOrderById(order.id);
    await this.activityLogService.log({
      action: 'order.save_table',
      entityType: 'order',
      entityId: order.id,
      severity: 'info',
      branchId: order.branchId || null,
      createdById: saveDto.createdById || null,
      details: {
        orderNumber: order.orderNumber,
        tableNumber,
        addedItems: items.map((i) => ({ name: i.productName, qty: i.quantity })),
      },
    });
    this.realtimeService.emit('order.saved', order.branchId || null, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber,
    });
    if (kitchenOrderItems.length > 0) {
      this.realtimeService.emit('kds.updated', order.branchId || null, {
        orderId: order.id,
        tableNumber,
      });
    }
    return result;
  }

  async checkoutOpenOrder(orderId: string, checkoutDto: any): Promise<any> {
    const order = await this.getOrderById(orderId, checkoutDto.branchId || null);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!OPEN_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order is already closed');
    }

    const items = order.items || [];
    if (items.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    const paymentMethod = await this.paymentMethodRepository.findOne({ where: { id: checkoutDto.paymentMethodId } });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    const idempotencyKey =
      typeof checkoutDto.idempotencyKey === 'string' && checkoutDto.idempotencyKey.trim()
        ? checkoutDto.idempotencyKey.trim()
        : null;
    if (idempotencyKey) {
      const existingPayment = await this.paymentRepository.findOne({ where: { idempotencyKey } });
      if (existingPayment) {
        if (existingPayment.orderId !== order.id) {
          throw new BadRequestException('Invalid idempotency key for this order');
        }
        return this.buildCheckoutResponse(order.id, existingPayment, checkoutDto.branchId || null);
      }
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.productRepository.findBy({ id: In(productIds) });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const stockChanges: Array<{ product: Product; quantity: number }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product not found for item ${item.productName}`);
      }

      if (product.usesBom && Array.isArray(product.bom) && product.bom.length > 0) {
        for (const bomItem of product.bom) {
          const ingredient = await this.productRepository.findOne({ where: { id: bomItem.ingredientProductId } });
          if (!ingredient) {
            throw new BadRequestException(`Missing ingredient for BOM: ${bomItem.ingredientProductId}`);
          }
          stockChanges.push({ product: ingredient, quantity: Number(bomItem.quantity) * item.quantity });
        }
      } else {
        stockChanges.push({ product, quantity: item.quantity });
      }
    }

    const requiredByProduct = new Map<string, number>();
    for (const change of stockChanges) {
      requiredByProduct.set(change.product.id, (requiredByProduct.get(change.product.id) || 0) + change.quantity);
    }

    for (const [productId, requiredQty] of requiredByProduct.entries()) {
      const product = await this.productRepository.findOne({ where: { id: productId } });
      if (!product || product.stockQuantity < requiredQty) {
        throw new BadRequestException(`Insufficient stock for product ${product?.name || productId}`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use query builder lock to avoid eager relation joins on Order(createdBy),
      // which causes PostgreSQL "FOR UPDATE ... nullable side of an outer join".
      const lockedOrder = await queryRunner.manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: order.id })
        .getOne();
      if (!lockedOrder || !OPEN_ORDER_STATUSES.includes(lockedOrder.status)) {
        throw new BadRequestException('Order is already closed');
      }

      const totals = this.calculateTotals(items, {
        taxRate: checkoutDto.taxRate,
        discountType: checkoutDto.discountType,
        discountValue: checkoutDto.discountValue,
        serviceCharge: checkoutDto.serviceCharge ?? order.serviceCharge,
      });

      const updateResult = await queryRunner.manager.update(Order, {
        id: order.id,
        status: In(OPEN_ORDER_STATUSES),
      }, {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        serviceCharge: totals.serviceCharge,
        totalAmount: totals.totalAmount,
        status: OrderStatus.PAID,
      });
      if (!updateResult.affected) {
        throw new BadRequestException('Order is already closed');
      }

      const payment = queryRunner.manager.create(Payment, {
        orderId: order.id,
        paymentMethodId: paymentMethod.id,
        amount: totals.totalAmount,
        status: PaymentStatus.COMPLETED,
        transactionId: checkoutDto.transactionId || null,
        idempotencyKey,
        notes: checkoutDto.paymentNotes,
        branchId: checkoutDto.branchId || order.branchId || null,
        createdById: checkoutDto.createdById || order.createdById,
      });
      await queryRunner.manager.save(payment);

      for (const [productId, requiredQty] of requiredByProduct.entries()) {
        const product = await queryRunner.manager.findOne(Product, { where: { id: productId } });
        if (!product) continue;

        const nextBalance = product.stockQuantity - requiredQty;
        await queryRunner.manager.update(Product, product.id, { stockQuantity: nextBalance });

        const stockLedger = queryRunner.manager.create(StockLedger, {
          productId: product.id,
          transactionType: TransactionType.OUT,
          quantity: requiredQty,
          balance: nextBalance,
          notes: `POS table checkout ${order.orderNumber}`,
          branchId: order.branchId || null,
          createdById: checkoutDto.createdById || order.createdById,
        });
        await queryRunner.manager.save(stockLedger);
      }

      await queryRunner.commitTransaction();
      await this.activityLogService.log({
        action: 'order.checkout',
        entityType: 'order',
        entityId: order.id,
        severity: 'warning',
        branchId: order.branchId || null,
        createdById: checkoutDto.createdById || order.createdById || null,
        details: {
          orderNumber: order.orderNumber,
          tableNumber: order.tableNumber || null,
          totalAmount: totals.totalAmount,
          paymentMethodId: paymentMethod.id,
          itemCount: items.length,
        },
      });
      this.realtimeService.emit('order.checked_out', order.branchId || null, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber || null,
        totalAmount: totals.totalAmount,
      });
      this.realtimeService.emit('kds.updated', order.branchId || null, {
        orderId: order.id,
      });
      return this.buildCheckoutResponse(order.id, undefined, checkoutDto.branchId || null);
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      if (idempotencyKey && error?.code === '23505') {
        const existingPayment = await this.paymentRepository.findOne({ where: { idempotencyKey } });
        if (existingPayment && existingPayment.orderId === order.id) {
          return this.buildCheckoutResponse(order.id, existingPayment, checkoutDto.branchId || null);
        }
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async buildCheckoutResponse(orderId: string, payment?: Payment | null, branchId?: string | null): Promise<any> {
    const finalOrder = await this.getOrderById(orderId, branchId);
    if (!finalOrder) {
      throw new NotFoundException('Order not found');
    }
    const finalPayment = payment || (await this.paymentRepository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    }));
    const cashierUser = await this.resolveUserById(finalPayment?.createdById || finalOrder.createdById);
    const cashierName = this.resolveDisplayName(cashierUser);
    const businessName = (cashierUser?.shopName || finalOrder.createdBy?.shopName || 'Rangoon F&B').trim();
    const businessPhone = cashierUser?.businessPhone || finalOrder.createdBy?.businessPhone || '';
    const businessAddress = cashierUser?.businessAddress || finalOrder.createdBy?.businessAddress || '';

    return {
      order: finalOrder,
      payment: finalPayment,
      receipt: {
        receiptNumber: `RCPT-${finalOrder.orderNumber}`,
        orderNumber: finalOrder.orderNumber,
        orderType: finalOrder.type,
        tableNumber: finalOrder.tableNumber || null,
        cashierName: cashierName || 'Counter',
        waiterName: finalOrder.takenByName || null,
        paymentMethod: finalPayment?.paymentMethod?.name || 'Unknown',
        businessName,
        businessPhone,
        businessAddress,
        printedAt: new Date().toISOString(),
        subtotal: Number(finalOrder.subtotal || 0),
        discountAmount: Number(finalOrder.discountAmount || 0),
        serviceCharge: Number(finalOrder.serviceCharge || 0),
        taxAmount: Number(finalOrder.taxAmount || 0),
        totalAmount: Number(finalOrder.totalAmount || 0),
        items: (finalOrder.items || []).map((item) => ({
          name: item.productName,
          qty: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
        })),
      },
    };
  }

  async getOpenOrders(branchId?: string | null, tableNumber?: number): Promise<Order[]> {
    const where: any = {
      status: In(OPEN_ORDER_STATUSES),
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (tableNumber && Number.isFinite(tableNumber)) {
      where.tableNumber = tableNumber;
    }

    return this.orderRepository.find({
      where,
      relations: ['items', 'payments'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getActiveTables(branchId?: string | null): Promise<any[]> {
    const openOrders = await this.getOpenOrders(branchId);
    return openOrders
      .filter((order) => order.tableNumber)
      .map((order) => ({
        tableNumber: order.tableNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount || 0),
        itemCount: (order.items || []).reduce((sum, item) => sum + item.quantity, 0),
        waiterId: order.createdById || null,
        waiterName: order.takenByName ||
          `${order.createdBy?.firstName || ''} ${order.createdBy?.lastName || ''}`.trim() ||
          order.createdBy?.email ||
          'Unknown',
        updatedAt: order.updatedAt,
      }));
  }

  private async resolveTakenByName(userId?: string): Promise<string | null> {
    const user = await this.resolveUserById(userId);
    return this.resolveDisplayName(user);
  }

  private async resolveUserById(userId?: string): Promise<User | null> {
    if (!userId) {
      return null;
    }
    return this.userRepository.findOne({ where: { id: userId } });
  }

  private resolveDisplayName(user?: User | null): string | null {
    if (!user) {
      return null;
    }
    return (
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      user.email ||
      null
    );
  }

  async checkout(checkoutDto: any): Promise<any> {
    const items = this.normalizeItems(checkoutDto.items);
    if (items.length === 0) {
      throw new BadRequestException('Order must include at least one item');
    }

    const tempOrder = await this.createOrder({
      ...checkoutDto,
      items,
      status: OrderStatus.CONFIRMED,
    });

    if (!tempOrder) {
      throw new BadRequestException('Failed to create order');
    }

    return this.checkoutOpenOrder(tempOrder.id, checkoutDto);
  }

  async getAllOrders(branchId?: string | null): Promise<Order[]> {
    const where: any = {};
    if (branchId) {
      where.branchId = branchId;
    }
    return this.orderRepository.find({
      where,
      relations: ['items', 'payments'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getOrderById(id: string, branchId?: string | null): Promise<Order | null> {
    const where: any = { id };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.orderRepository.findOne({
      where,
      relations: ['items', 'payments'],
    });
  }

  async getReceipt(orderId: string, branchId?: string | null): Promise<any> {
    const order = await this.getOrderById(orderId, branchId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      receiptNumber: `RCPT-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
      items: (order.items || []).map((item) => ({
        name: item.productName,
        qty: item.quantity,
        price: Number(item.price),
        total: Number(item.total),
      })),
    };
  }

  async updateOrderStatus(id: string, status: OrderStatus, branchId?: string | null): Promise<Order | null> {
    const where: any = { id };
    if (branchId) {
      where.branchId = branchId;
    }
    await this.orderRepository.update(where, { status });
    return this.getOrderById(id, branchId);
  }

  async addItemToOrder(orderId: string, itemData: any, branchId?: string | null): Promise<OrderItem | null> {
    const order = await this.getOrderById(orderId, branchId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const itemDataWithTotal = {
      ...itemData,
      orderId,
      total: Number(itemData.price) * Number(itemData.quantity),
    };

    const item = this.orderItemRepository.create(itemDataWithTotal);
    const savedItem = await this.orderItemRepository.save(item);
    if (Array.isArray(savedItem)) {
      return savedItem[0] as unknown as OrderItem;
    }
    return savedItem as unknown as OrderItem;
  }

  async removeItemFromOrder(itemId: string): Promise<void> {
    await this.orderItemRepository.delete(itemId);
  }

  private normalizeItems(items: any[]): Array<{ productId: string; productName: string; quantity: number; price: number; notes?: string }> {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item) => ({
        productId: String(item.productId || '').trim(),
        productName: String(item.productName || '').trim(),
        quantity: Number(item.quantity),
        price: Number(item.price),
        notes: item.notes,
      }))
      .filter((item) => item.productId && item.productName && item.quantity > 0 && item.price >= 0);
  }

  private normalizePercent(value: any, defaultValue = 5): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return defaultValue;
    return Math.min(100, Math.max(0, Number(numeric.toFixed(2))));
  }

  private normalizeMoney(value: any, defaultValue = 0): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return defaultValue;
    return Math.max(0, Number(numeric.toFixed(2)));
  }

  private calculateTotals(
    items: Array<{ price: number; quantity: number }>,
    options?: {
      taxRate?: number;
      discountType?: string;
      discountValue?: number;
      serviceCharge?: number;
    },
  ): {
    subtotal: number;
    discountAmount: number;
    serviceCharge: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const subtotal = Number(
      items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0).toFixed(2),
    );
    const taxRate = this.normalizePercent(options?.taxRate, 5);
    const serviceCharge = this.normalizeMoney(options?.serviceCharge, 0);
    const discountType = String(options?.discountType || 'none').toLowerCase();
    const discountValue = this.normalizeMoney(options?.discountValue, 0);

    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = Number((subtotal * Math.min(discountValue, 100) / 100).toFixed(2));
    } else if (discountType === 'fixed') {
      discountAmount = discountValue;
    }

    discountAmount = Math.min(subtotal, this.normalizeMoney(discountAmount, 0));
    const taxableBase = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));
    const taxAmount = Number((taxableBase * taxRate / 100).toFixed(2));
    const totalAmount = Number((taxableBase + taxAmount + serviceCharge).toFixed(2));

    return { subtotal, discountAmount, serviceCharge, taxAmount, totalAmount };
  }
}
