import { IsNotEmpty, IsEnum, IsDateString, IsOptional, IsString, IsNumber, IsUUID, Min, Max } from 'class-validator';
import { ReservationStatus, ReservationType } from '../entities/reservation.entity';

export class CreateReservationDto {
  @IsNotEmpty()
  @IsEnum(ReservationType)
  type!: ReservationType;

  @IsNotEmpty()
  @IsDateString()
  reservationDateTime!: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  tableNumber?: number;

  @IsOptional()
  @IsString()
  roomName?: string;

  @IsNotEmpty()
  @IsString()
  customerName!: string;

  @IsNotEmpty()
  @IsString()
  customerPhone!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  numberOfGuests?: number;

  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsNotEmpty()
  @IsUUID()
  branchId!: string;
}