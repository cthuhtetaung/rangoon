import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { PurchaseItem } from '../entities/purchase-item.entity';
import { Product } from '../../products/entities/product.entity';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseItem)
    private purchaseItemRepository: Repository<PurchaseItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createPurchaseOrderDto: CreatePurchaseOrderDto & { createdById?: string }): Promise<PurchaseOrder> {
    // Generate order number
    const orderNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const purchaseOrder = this.purchaseOrderRepository.create({
      ...createPurchaseOrderDto,
      orderNumber,
    });

    // Calculate totals if not provided
    if (!purchaseOrder.subtotal && createPurchaseOrderDto.items) {
      purchaseOrder.subtotal = createPurchaseOrderDto.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
    }

    if (!purchaseOrder.totalAmount) {
      purchaseOrder.totalAmount =
        (purchaseOrder.subtotal || 0) +
        (purchaseOrder.taxAmount || 0) -
        (purchaseOrder.discountAmount || 0);
    }

    const savedOrder = await this.purchaseOrderRepository.save(purchaseOrder);

    // Save items if provided
    if (createPurchaseOrderDto.items && createPurchaseOrderDto.items.length > 0) {
      const items = createPurchaseOrderDto.items.map(item => {
        const purchaseItem = new PurchaseItem();
        purchaseItem.productId = item.productId;
        purchaseItem.unitPrice = item.unitPrice;
        purchaseItem.quantity = item.quantity;
        purchaseItem.total = item.total;
        purchaseItem.purchaseOrderId = savedOrder.id;
        return purchaseItem;
      });

      await this.purchaseItemRepository.save(items);
    }

    return this.findOne(savedOrder.id);
  }

  async findAll(branchId?: string): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepository.find({
      where: branchId ? { branchId } : {},
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string, branchId?: string): Promise<PurchaseOrder> {
    const where: any = { id };
    if (branchId) where.branchId = branchId;
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where,
      relations: ['items', 'items.product'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }

    return purchaseOrder;
  }

  async update(id: string, updatePurchaseOrderDto: UpdatePurchaseOrderDto, branchId?: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(id, branchId);

    Object.assign(purchaseOrder, updatePurchaseOrderDto);

    // Recalculate totals if items are updated
    if (updatePurchaseOrderDto.items) {
      // Remove existing items
      await this.purchaseItemRepository.delete({ purchaseOrderId: id });

      // Add new items
      if (updatePurchaseOrderDto.items.length > 0) {
        const items = updatePurchaseOrderDto.items.map(item => {
          const purchaseItem = new PurchaseItem();
          purchaseItem.productId = item.productId;
          purchaseItem.unitPrice = item.unitPrice;
          purchaseItem.quantity = item.quantity;
          purchaseItem.total = item.total;
          purchaseItem.purchaseOrderId = id;
          return purchaseItem;
        });

        await this.purchaseItemRepository.save(items);
      }
    }

    // Recalculate totals if needed
    if (updatePurchaseOrderDto.items || updatePurchaseOrderDto.subtotal !== undefined) {
      const items = await this.purchaseItemRepository.find({ where: { purchaseOrderId: id } });
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      purchaseOrder.subtotal = subtotal;
      purchaseOrder.totalAmount =
        subtotal + (purchaseOrder.taxAmount || 0) - (purchaseOrder.discountAmount || 0);
    }

    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async remove(id: string, branchId?: string): Promise<void> {
    const purchaseOrder = await this.findOne(id, branchId);
    await this.purchaseOrderRepository.remove(purchaseOrder);
  }

  async getPurchaseOrdersByStatus(status: PurchaseOrderStatus, branchId?: string): Promise<PurchaseOrder[]> {
    const where: any = { status };
    if (branchId) where.branchId = branchId;
    return this.purchaseOrderRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getPurchaseOrdersByDateRange(
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ): Promise<PurchaseOrder[]> {
    const where: any = {
      orderDate: Between(startDate, endDate),
    };
    if (branchId) where.branchId = branchId;
    return this.purchaseOrderRepository.find({
      where,
      order: {
        orderDate: 'DESC',
      },
    });
  }

  async receivePurchaseOrder(id: string, branchId?: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(id, branchId);
    
    // Update status to received
    purchaseOrder.status = PurchaseOrderStatus.RECEIVED;
    
    // Update product stock quantities
    for (const item of purchaseOrder.items) {
      const product = await this.productRepository.findOne({ where: { id: item.productId } });
      if (product) {
        product.stockQuantity += item.quantity;
        await this.productRepository.save(product);
      }
    }
    
    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async getPurchaseOrderStats(branchId?: string): Promise<any> {
    const scopedWhere = (status?: PurchaseOrderStatus): any => {
      const where: any = {};
      if (status) where.status = status;
      if (branchId) where.branchId = branchId;
      return where;
    };
    const totalOrders = await this.purchaseOrderRepository.count({
      where: scopedWhere(),
    });
    const pendingOrders = await this.purchaseOrderRepository.count({
      where: scopedWhere(PurchaseOrderStatus.PENDING),
    });
    const approvedOrders = await this.purchaseOrderRepository.count({
      where: scopedWhere(PurchaseOrderStatus.APPROVED),
    });
    const receivedOrders = await this.purchaseOrderRepository.count({
      where: scopedWhere(PurchaseOrderStatus.RECEIVED),
    });

    // Calculate total purchase value
    let totalPurchaseValueQuery = this.purchaseOrderRepository
      .createQueryBuilder('purchaseOrder')
      .select('SUM(purchaseOrder.totalAmount)', 'total');
    if (branchId) {
      totalPurchaseValueQuery = totalPurchaseValueQuery.where('purchaseOrder.branchId = :branchId', { branchId });
    }
    const totalPurchaseValueResult = await totalPurchaseValueQuery.getRawOne();

    const totalPurchaseValue = parseFloat(totalPurchaseValueResult.total) || 0;

    return {
      total: totalOrders,
      pending: pendingOrders,
      approved: approvedOrders,
      received: receivedOrders,
      totalPurchaseValue,
    };
  }
}
