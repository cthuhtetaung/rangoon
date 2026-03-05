import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto & { branchId?: string | null }): Promise<Supplier> {
    const supplier = this.supplierRepository.create(createSupplierDto);
    return this.supplierRepository.save(supplier);
  }

  async findAll(branchId?: string): Promise<Supplier[]> {
    return this.supplierRepository.find({
      where: branchId ? { branchId } : {},
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string, branchId?: string): Promise<Supplier> {
    const where: any = { id };
    if (branchId) where.branchId = branchId;
    const supplier = await this.supplierRepository.findOne({
      where,
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto, branchId?: string): Promise<Supplier> {
    const supplier = await this.findOne(id, branchId);
    Object.assign(supplier, updateSupplierDto);
    return this.supplierRepository.save(supplier);
  }

  async remove(id: string, branchId?: string): Promise<void> {
    const supplier = await this.findOne(id, branchId);
    await this.supplierRepository.remove(supplier);
  }

  async getActiveSuppliers(branchId?: string): Promise<Supplier[]> {
    return this.supplierRepository.find({
      where: branchId ? { isActive: true, branchId } : { isActive: true },
      order: {
        name: 'ASC',
      },
    });
  }

  async getSupplierStats(branchId?: string): Promise<any> {
    const totalSuppliers = await this.supplierRepository.count({
      where: branchId ? { branchId } : {},
    });
    const activeSuppliers = await this.supplierRepository.count({
      where: branchId ? { isActive: true, branchId } : { isActive: true },
    });

    return {
      total: totalSuppliers,
      active: activeSuppliers,
    };
  }
}
