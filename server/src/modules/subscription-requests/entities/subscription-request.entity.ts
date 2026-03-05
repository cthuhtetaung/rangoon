import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('subscription_requests')
export class SubscriptionRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ownerUserId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  ownerUser!: User;

  @Column({ type: 'int' })
  planMonths!: number;

  @Column({ type: 'int' })
  amountMmk!: number;

  @Column({ type: 'varchar', length: 40 })
  paymentMethod!: string;

  @Column({ type: 'varchar', length: 150 })
  payerShopName!: string;

  @Column({ type: 'varchar', length: 30 })
  payerPhone!: string;

  @Column({ type: 'varchar', length: 5 })
  txLast5!: string;

  @Column({ type: 'text' })
  proofImageDataUrl!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'text', nullable: true })
  reviewNote!: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  reviewedBy!: User | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
