import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export enum TransactionType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment'
}

@Entity('stock_ledgers')
export class StockLedger {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'enum', enum: TransactionType })
  transactionType!: TransactionType;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int' })
  balance!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPrice!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => Product, { eager: true })
  product!: Product;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
