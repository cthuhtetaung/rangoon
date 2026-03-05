import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Order } from '../../pos/entities/order.entity';
import { PaymentMethod } from './payment-method.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'uuid' })
  paymentMethodId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId!: string;

  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  idempotencyKey!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => Order, order => order.payments)
  order!: Order;

  @ManyToOne(() => PaymentMethod, { eager: true })
  paymentMethod!: PaymentMethod;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
