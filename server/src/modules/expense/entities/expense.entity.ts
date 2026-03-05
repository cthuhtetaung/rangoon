import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { ExpenseCategory } from './expense-category.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'timestamp' })
  expenseDate!: Date;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string;

  @ManyToOne(() => ExpenseCategory, { eager: true })
  category!: ExpenseCategory;

  @ManyToOne(() => Branch, { eager: true })
  branch!: Branch;

  @ManyToOne(() => User, { eager: true })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}