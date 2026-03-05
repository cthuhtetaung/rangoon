import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff, StaffRole } from '../entities/staff.entity';
import { Commission } from '../entities/commission.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Commission)
    private commissionRepository: Repository<Commission>,
  ) {}

  async create(createStaffDto: any): Promise<Staff | null> {
    const staff = this.staffRepository.create(createStaffDto);
    const savedStaff = await this.staffRepository.save(staff);
    // Handle TypeORM union return type issue
    if (Array.isArray(savedStaff)) {
      return savedStaff[0] as unknown as Staff;
    }
    return savedStaff as unknown as Staff;
  }

  async findAll(): Promise<Staff[]> {
    return this.staffRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Staff | null> {
    return this.staffRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateStaffDto: any): Promise<Staff | null> {
    await this.staffRepository.update(id, updateStaffDto);
    return this.staffRepository.findOne({
      where: { id },
    });
  }

  async remove(id: string): Promise<void> {
    await this.staffRepository.delete(id);
  }

  async getActiveStaff(): Promise<Staff[]> {
    return this.staffRepository.find({
      where: { isActive: true },
      order: { firstName: 'ASC' },
    });
  }

  async getStaffByBranch(branchId: string): Promise<Staff[]> {
    return this.staffRepository.find({
      where: { branchId, isActive: true },
      order: { firstName: 'ASC' },
    });
  }

  async getStaffByRole(role: StaffRole): Promise<Staff[]> {
    return this.staffRepository.find({
      where: { role, isActive: true },
      order: { firstName: 'ASC' },
    });
  }

  // Commission methods
  async addCommission(commissionData: any): Promise<Commission | null> {
    const commission = this.commissionRepository.create(commissionData);
    const savedCommission = await this.commissionRepository.save(commission);
    // Handle TypeORM union return type issue
    if (Array.isArray(savedCommission)) {
      return savedCommission[0] as unknown as Commission;
    }
    return savedCommission as unknown as Commission;
  }

  async getCommissionsByStaff(staffId: string): Promise<Commission[]> {
    return this.commissionRepository.find({
      where: { staffId },
      order: { createdAt: 'DESC' },
      relations: ['order'],
    });
  }

  async getCommissionsByBranch(branchId: string, startDate?: Date, endDate?: Date): Promise<Commission[]> {
    let query = this.commissionRepository.createQueryBuilder('commission')
      .where('commission.branchId = :branchId', { branchId });

    if (startDate) {
      query = query.andWhere('commission.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query = query.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    return query
      .orderBy('commission.createdAt', 'DESC')
      .getMany();
  }

  async calculateTotalCommission(staffId: string): Promise<number> {
    const commissions = await this.commissionRepository.find({
      where: { staffId },
    });
    
    return commissions.reduce((total, commission) => total + commission.commissionAmount, 0);
  }
}