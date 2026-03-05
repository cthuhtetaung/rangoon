import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Branch } from '../../branches/entities/branch.entity';

export enum PromotionType {
  DISCOUNT = 'discount',
  PACKAGE = 'package',
  BUY_X_GET_Y = 'buy_x_get_y'
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount'
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'enum', enum: PromotionType })
  type!: PromotionType;

  @Column({ type: 'enum', enum: DiscountType, nullable: true })
  discountType!: DiscountType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountValue!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  packagePrice!: number;

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp' })
  endDate!: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  minOrderAmount!: number;

  @Column({ type: 'int', default: 1 })
  buyQuantity!: number;

  @Column({ type: 'int', default: 1 })
  freeQuantity!: number;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, { eager: true })
  branch!: Branch;

  @ManyToMany(() => Product, { eager: true })
  @JoinTable({
    name: 'promotion_products',
    joinColumn: { name: 'promotionId' },
    inverseJoinColumn: { name: 'productId' }
  })
  products!: Product[];

  @ManyToMany(() => Product, { eager: true })
  @JoinTable({
    name: 'promotion_free_products',
    joinColumn: { name: 'promotionId' },
    inverseJoinColumn: { name: 'productId' }
  })
  freeProducts!: Product[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}