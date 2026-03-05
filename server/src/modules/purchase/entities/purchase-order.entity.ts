import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Supplier } from './supplier.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { PurchaseItem } from './purchase-item.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  ORDERED = 'ordered',
  RECEIVED = 'received',
  CANCELLED = 'cancelled'
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber!: string;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status!: PurchaseOrderStatus;

  @Column({ type: 'timestamp' })
  orderDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  expectedDeliveryDate!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string;

  @ManyToOne(() => Supplier, { eager: true })
  supplier!: Supplier;

  @ManyToOne(() => Branch, { eager: true })
  branch!: Branch;

  @ManyToOne(() => User, { eager: true })
  createdBy!: User;

  @OneToMany(() => PurchaseItem, item => item.purchaseOrder, { cascade: true })
  items!: PurchaseItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}