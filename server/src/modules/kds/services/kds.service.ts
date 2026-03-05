import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { KitchenOrder, KitchenOrderStatus } from '../entities/kitchen-order.entity';
import { Order } from '../../pos/entities/order.entity';
import { OrderItem } from '../../pos/entities/order-item.entity';
import { RealtimeService } from '../../realtime/services/realtime.service';

@Injectable()
export class KdsService {
  constructor(
    @InjectRepository(KitchenOrder)
    private kitchenOrderRepository: Repository<KitchenOrder>,
    private realtimeService: RealtimeService,
  ) {}

  async createKitchenOrder(order: Order, orderItem: OrderItem): Promise<KitchenOrder> {
    const kitchenOrder = this.kitchenOrderRepository.create({
      orderId: order.id,
      orderItemId: orderItem.id,
      itemName: orderItem.productName,
      quantity: orderItem.quantity,
      status: KitchenOrderStatus.PENDING,
      branchId: order.branchId,
    });

    const saved = await this.kitchenOrderRepository.save(kitchenOrder);
    this.realtimeService.emit('kds.updated', order.branchId || null, {
      orderId: order.id,
      orderItemId: orderItem.id,
      status: KitchenOrderStatus.PENDING,
    });
    if (Array.isArray(saved)) {
      return saved[0] as unknown as KitchenOrder;
    }
    return saved as unknown as KitchenOrder;
  }

  async getPendingOrders(branchId: string | null): Promise<KitchenOrder[]> {
    return this.kitchenOrderRepository.find({
      where: {
        branchId: branchId === null ? IsNull() : branchId,
        status: KitchenOrderStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async getPreparingOrders(branchId: string | null): Promise<KitchenOrder[]> {
    return this.kitchenOrderRepository.find({
      where: {
        branchId: branchId === null ? IsNull() : branchId,
        status: KitchenOrderStatus.PREPARING,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async getReadyOrders(branchId: string | null): Promise<KitchenOrder[]> {
    return this.kitchenOrderRepository.find({
      where: {
        branchId: branchId === null ? IsNull() : branchId,
        status: KitchenOrderStatus.READY,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async getServedOrders(branchId: string | null, date?: string): Promise<KitchenOrder[]> {
    const where: any = {
      branchId: branchId === null ? IsNull() : branchId,
      status: KitchenOrderStatus.SERVED,
    };

    if (date) {
      const startDate = new Date(`${date}T00:00:00`);
      const endDate = new Date(`${date}T23:59:59.999`);
      where.updatedAt = Between(startDate, endDate);
    }

    return this.kitchenOrderRepository.find({
      where,
      order: { updatedAt: 'DESC' },
    });
  }

  async getReadyNotifications(branchId: string | null): Promise<any[]> {
    const readyOrders = await this.kitchenOrderRepository.find({
      where: {
        branchId: branchId === null ? IsNull() : branchId,
        status: KitchenOrderStatus.READY,
      },
      order: { updatedAt: 'DESC' },
    });

    return readyOrders.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      orderNumber: item.order?.orderNumber || '',
      tableNumber: item.order?.tableNumber || null,
      itemName: item.itemName,
      quantity: item.quantity,
      status: item.status,
      readyAt: item.updatedAt,
    }));
  }

  async updateOrderStatus(id: string, status: KitchenOrderStatus, preparedById?: string): Promise<KitchenOrder | null> {
    const updateData: any = { status };

    if (status === KitchenOrderStatus.PREPARING) {
      updateData.preparedAt = new Date();
    }

    if (preparedById) {
      updateData.preparedById = preparedById;
    }

    await this.kitchenOrderRepository.update(id, updateData);
    const item = await this.kitchenOrderRepository.findOne({ where: { id } });
    if (item) {
      this.realtimeService.emit('kds.updated', item.branchId || null, {
        kitchenOrderId: item.id,
        orderId: item.orderId,
        status: item.status,
      });
      if (item.status === KitchenOrderStatus.READY) {
        this.realtimeService.emit('kds.ready', item.branchId || null, {
          kitchenOrderId: item.id,
          orderId: item.orderId,
          itemName: item.itemName,
          quantity: item.quantity,
        });
      }
    }
    return item;
  }

  async cancelOrder(id: string): Promise<KitchenOrder | null> {
    await this.kitchenOrderRepository.update(id, {
      status: KitchenOrderStatus.CANCELLED,
    });
    const item = await this.kitchenOrderRepository.findOne({ where: { id } });
    if (item) {
      this.realtimeService.emit('kds.updated', item.branchId || null, {
        kitchenOrderId: item.id,
        orderId: item.orderId,
        status: item.status,
      });
    }
    return item;
  }

  async markAsServed(id: string, servedById?: string): Promise<KitchenOrder | null> {
    const updateData: any = {
      status: KitchenOrderStatus.SERVED,
    };
    if (servedById) {
      updateData.preparedById = servedById;
    }
    await this.kitchenOrderRepository.update(id, updateData);
    const item = await this.kitchenOrderRepository.findOne({ where: { id } });
    if (item) {
      this.realtimeService.emit('kds.updated', item.branchId || null, {
        kitchenOrderId: item.id,
        orderId: item.orderId,
        status: item.status,
      });
      this.realtimeService.emit('kds.served', item.branchId || null, {
        kitchenOrderId: item.id,
        orderId: item.orderId,
      });
    }
    return item;
  }
}
