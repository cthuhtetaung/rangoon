import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { ReservationStatus, ReservationType } from '../entities/reservation.entity';

export class ReservationQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsEnum(ReservationType)
  type?: ReservationType;

  @IsOptional()
  @IsDateString()
  dateFrom?: Date;

  @IsOptional()
  @IsDateString()
  dateTo?: Date;
}