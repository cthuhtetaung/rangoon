import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { IsEmail, IsString, MinLength } from 'class-validator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  firstName!: string;

  @Column()
  @IsString()
  lastName!: string;

  @Column({ unique: true })
  @IsEmail()
  email!: string;

  @Column()
  @MinLength(6)
  password!: string;

  @Column({ type: 'varchar', default: 'staff' })
  role!: 'admin' | 'owner' | 'manager' | 'staff' | 'cashier' | 'waiter' | 'chef';

  @Column({ type: 'varchar', nullable: true })
  phone!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  shopName!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  businessPhone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessAddress!: string | null;

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', default: 'mm' })
  language!: 'mm' | 'en';

  @Column({ type: 'jsonb', default: () => "'[]'" })
  extraPermissions!: string[];

  @Column({ type: 'varchar', length: 20, default: 'free' })
  subscriptionPlan!: 'free' | 'monthly' | 'yearly';

  @Column({ type: 'varchar', length: 20, default: 'active' })
  subscriptionStatus!: 'active' | 'inactive';

  @Column({ type: 'timestamp', nullable: true })
  subscriptionStartAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  refreshTokenHash!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
