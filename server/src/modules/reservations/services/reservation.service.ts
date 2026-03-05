import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Reservation, ReservationStatus, ReservationType } from '../entities/reservation.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationQueryDto } from '../dto/reservation-query.dto';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
  ) {}

  async create(createReservationDto: CreateReservationDto): Promise<Reservation> {
    // Generate reservation number
    const reservationNumber = `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const reservation = this.reservationRepository.create({
      ...createReservationDto,
      reservationNumber,
    });
    
    return this.reservationRepository.save(reservation);
  }

  async findAll(query: ReservationQueryDto): Promise<Reservation[]> {
    const qb = this.reservationRepository.createQueryBuilder('reservation');
    
    if (query.branchId) {
      qb.andWhere('reservation.branchId = :branchId', { branchId: query.branchId });
    }
    
    if (query.status) {
      qb.andWhere('reservation.status = :status', { status: query.status });
    }
    
    if (query.type) {
      qb.andWhere('reservation.type = :type', { type: query.type });
    }
    
    if (query.dateFrom && query.dateTo) {
      qb.andWhere('reservation.reservationDateTime BETWEEN :dateFrom AND :dateTo', {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
    } else if (query.dateFrom) {
      qb.andWhere('reservation.reservationDateTime >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    } else if (query.dateTo) {
      qb.andWhere('reservation.reservationDateTime <= :dateTo', {
        dateTo: query.dateTo,
      });
    }
    
    return qb.getMany();
  }

  async findOne(id: string, branchId?: string): Promise<Reservation> {
    const where: any = { id };
    if (branchId) {
      where.branchId = branchId;
    }
    const reservation = await this.reservationRepository.findOne({ where });
    
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    
    return reservation;
  }

  async update(id: string, updateReservationDto: UpdateReservationDto, branchId?: string): Promise<Reservation> {
    const reservation = await this.findOne(id, branchId);
    
    Object.assign(reservation, updateReservationDto);
    
    return this.reservationRepository.save(reservation);
  }

  async remove(id: string, branchId?: string): Promise<void> {
    const reservation = await this.findOne(id, branchId);
    await this.reservationRepository.remove(reservation);
  }

  async findByDateRange(
    branchId: string,
    startDate: Date,
    endDate: Date,
    type?: ReservationType,
  ): Promise<Reservation[]> {
    const query: any = {
      branchId,
      reservationDateTime: Between(startDate, endDate),
    };
    
    if (type) {
      query.type = type;
    }
    
    return this.reservationRepository.find({
      where: query,
      order: {
        reservationDateTime: 'ASC',
      },
    });
  }

  async getUpcomingReservations(branchId: string, days: number = 7): Promise<Reservation[]> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    return this.reservationRepository.find({
      where: {
        branchId,
        reservationDateTime: Between(today, endDate),
        status: ReservationStatus.CONFIRMED,
      },
      order: {
        reservationDateTime: 'ASC',
      },
    });
  }

  async getReservationStats(branchId: string): Promise<any> {
    const totalReservations = await this.reservationRepository.count({
      where: { branchId },
    });
    
    const confirmedReservations = await this.reservationRepository.count({
      where: { branchId, status: ReservationStatus.CONFIRMED },
    });
    
    const checkedInReservations = await this.reservationRepository.count({
      where: { branchId, status: ReservationStatus.CHECKED_IN },
    });
    
    const cancelledReservations = await this.reservationRepository.count({
      where: { branchId, status: ReservationStatus.CANCELLED },
    });
    
    return {
      total: totalReservations,
      confirmed: confirmedReservations,
      checkedIn: checkedInReservations,
      cancelled: cancelledReservations,
    };
  }
}
