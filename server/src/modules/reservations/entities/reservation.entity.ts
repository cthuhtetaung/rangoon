import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  COMPLETED = 'completed'
}

export enum ReservationType {
  TABLE = 'table',
  ROOM = 'room'
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  reservationNumber!: string;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status!: ReservationStatus;

  @Column({ type: 'enum', enum: ReservationType })
  type!: ReservationType;

  @Column({ type: 'timestamp' })
  reservationDateTime!: Date;

  @Column({ type: 'int', nullable: true })
  tableNumber!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  roomName!: string;

  @Column({ type: 'varchar', length: 100 })
  customerName!: string;

  @Column({ type: 'varchar', length: 20 })
  customerPhone!: string;

  @Column({ type: 'int', default: 1 })
  numberOfGuests!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositAmount!: number;

  @Column({ type: 'text', nullable: true })
  specialRequests!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string;

  @ManyToOne(() => Branch, { eager: true })
  branch!: Branch;

  @ManyToOne(() => User, { eager: true })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}