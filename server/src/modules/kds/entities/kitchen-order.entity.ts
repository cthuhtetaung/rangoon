import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Order } from '../../pos/entities/order.entity';
import { OrderItem } from '../../pos/entities/order-item.entity';

export enum KitchenOrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled'
}

@Entity('kitchen_orders')
export class KitchenOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'uuid' })
  orderItemId!: string;

  @Column({ type: 'varchar', length: 100 })
  itemName!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'enum', enum: KitchenOrderStatus, default: KitchenOrderStatus.PENDING })
  status!: KitchenOrderStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'timestamp', nullable: true })
  preparedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  preparedById!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => Order, { eager: true })
  order!: Order;

  @ManyToOne(() => OrderItem, { eager: true })
  orderItem!: OrderItem;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
