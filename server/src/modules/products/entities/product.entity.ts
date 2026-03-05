import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Category } from './category.entity';

export type ProductType = 'sellable' | 'ingredient';
export type BomItem = {
  ingredientProductId: string;
  quantity: number;
};

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'int', default: 0 })
  stockQuantity!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', default: 'sellable' })
  productType!: ProductType;

  @Column({ type: 'boolean', default: false })
  usesBom!: boolean;

  @Column({ type: 'boolean', default: false })
  sendToKitchen!: boolean;

  @Column({ type: 'varchar', length: 80, nullable: true, default: null })
  menuLabel!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  bom!: BomItem[] | null;

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string;

  @ManyToOne(() => Category, { eager: true })
  category!: Category;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
