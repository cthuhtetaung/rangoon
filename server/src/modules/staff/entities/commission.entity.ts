import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Staff } from './staff.entity';
import { Order } from '../../pos/entities/order.entity';

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  staffId!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Staff, { eager: true })
  staff!: Staff;

  @ManyToOne(() => Order, { eager: true })
  order!: Order;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}