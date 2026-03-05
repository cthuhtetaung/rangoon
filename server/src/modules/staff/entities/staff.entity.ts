import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';

export enum StaffRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  STAFF = 'staff',
  CASHIER = 'cashier',
  CHEF = 'chef',
  WAITER = 'waiter',
}

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  firstName!: string;

  @Column({ type: 'varchar', length: 50 })
  lastName!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string;

  @Column({ type: 'enum', enum: StaffRole, default: StaffRole.STAFF })
  role!: StaffRole;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'date', nullable: true })
  hireDate!: Date;

  @Column({ type: 'date', nullable: true })
  terminationDate!: Date;

  @ManyToOne(() => Branch, { eager: true })
  branch!: Branch;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
