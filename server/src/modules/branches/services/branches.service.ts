import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../entities/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
  ) {}

  async create(createBranchDto: any): Promise<Branch | null> {
    const branch = this.branchRepository.create(createBranchDto);
    const savedBranch = await this.branchRepository.save(branch);
    // Handle TypeORM union return type issue
    if (Array.isArray(savedBranch)) {
      return savedBranch[0] as unknown as Branch;
    }
    return savedBranch as unknown as Branch;
  }

  async findAll(): Promise<Branch[]> {
    return this.branchRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Branch | null> {
    return this.branchRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateBranchDto: any): Promise<Branch | null> {
    await this.branchRepository.update(id, updateBranchDto);
    return this.branchRepository.findOne({
      where: { id },
    });
  }

  async remove(id: string): Promise<void> {
    await this.branchRepository.delete(id);
  }

  async getActiveBranches(): Promise<Branch[]> {
    return this.branchRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async setHeadquarters(branchId: string): Promise<Branch | null> {
    // First, unset any existing headquarters
    await this.branchRepository.update(
      { isHeadquarters: true },
      { isHeadquarters: false }
    );
    
    // Then set the new headquarters
    await this.branchRepository.update(branchId, { isHeadquarters: true });
    
    return this.branchRepository.findOne({
      where: { id: branchId },
    });
  }

  async ensureDefaultBranch(): Promise<Branch> {
    const existing = await this.branchRepository.findOne({
      where: { isHeadquarters: true },
    });
    if (existing) {
      return existing;
    }

    const first = await this.branchRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });
    if (first) {
      first.isHeadquarters = true;
      first.isActive = true;
      return this.branchRepository.save(first);
    }

    const branch = this.branchRepository.create({
      name: 'Main Branch',
      address: 'Yangon',
      phone: '',
      tableCount: 12,
      isActive: true,
      isHeadquarters: true,
    });
    return this.branchRepository.save(branch);
  }
}
