import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ type: 'varchar', length: 80 })
  entityType!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  entityId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'info' })
  severity!: 'info' | 'warning' | 'critical';

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, any> | null;

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  createdBy!: User | null;

  @CreateDateColumn()
  createdAt!: Date;
}

