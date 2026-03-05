import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Brackets } from 'typeorm';
import { Promotion, PromotionType } from '../entities/promotion.entity';
import { Product } from '../../products/entities/product.entity';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    const promotion = new Promotion();
    Object.assign(promotion, createPromotionDto);

    // Load products if IDs are provided
    if (createPromotionDto.productIds && createPromotionDto.productIds.length > 0) {
      promotion.products = await this.productRepository.findByIds(createPromotionDto.productIds);
    }

    if (createPromotionDto.freeProductIds && createPromotionDto.freeProductIds.length > 0) {
      promotion.freeProducts = await this.productRepository.findByIds(createPromotionDto.freeProductIds);
    }

    return this.promotionRepository.save(promotion);
  }

  async findAll(branchId?: string): Promise<Promotion[]> {
    return this.promotionRepository.find({
      where: branchId ? { branchId } : {},
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string, branchId?: string): Promise<Promotion> {
    const where: any = { id };
    if (branchId) where.branchId = branchId;
    const promotion = await this.promotionRepository.findOne({
      where,
      relations: ['products', 'freeProducts'],
    });

    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }

    return promotion;
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto, branchId?: string): Promise<Promotion> {
    const promotion = await this.findOne(id, branchId);

    Object.assign(promotion, updatePromotionDto);

    // Update products if IDs are provided
    if (updatePromotionDto.productIds) {
      if (updatePromotionDto.productIds.length > 0) {
        promotion.products = await this.productRepository.findByIds(updatePromotionDto.productIds);
      } else {
        promotion.products = [];
      }
    }

    if (updatePromotionDto.freeProductIds) {
      if (updatePromotionDto.freeProductIds.length > 0) {
        promotion.freeProducts = await this.productRepository.findByIds(updatePromotionDto.freeProductIds);
      } else {
        promotion.freeProducts = [];
      }
    }

    return this.promotionRepository.save(promotion);
  }

  async remove(id: string, branchId?: string): Promise<void> {
    const promotion = await this.findOne(id, branchId);
    await this.promotionRepository.remove(promotion);
  }

  async getActivePromotions(branchId: string, date: Date = new Date()): Promise<Promotion[]> {
    return this.promotionRepository
      .createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.products', 'products')
      .leftJoinAndSelect('promotion.freeProducts', 'freeProducts')
      .where('promotion.branchId = :branchId', { branchId })
      .andWhere('promotion.isActive = true')
      .andWhere('promotion.startDate <= :date', { date })
      .andWhere('promotion.endDate >= :date', { date })
      .orderBy('promotion.createdAt', 'DESC')
      .getMany();
  }

  async getPromotionsByType(branchId: string, type: PromotionType): Promise<Promotion[]> {
    return this.promotionRepository.find({
      where: {
        branchId,
        type,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getUpcomingPromotions(branchId: string, days: number = 7): Promise<Promotion[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.branchId = :branchId', { branchId })
      .andWhere('promotion.startDate BETWEEN :today AND :futureDate', {
        today,
        futureDate,
      })
      .orderBy('promotion.startDate', 'ASC')
      .getMany();
  }

  async getExpiredPromotions(branchId: string): Promise<Promotion[]> {
    const today = new Date();
    return this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.branchId = :branchId', { branchId })
      .andWhere('promotion.endDate < :today', { today })
      .orderBy('promotion.endDate', 'ASC')
      .getMany();
  }

  async applyDiscount(promotion: Promotion, amount: number): Promise<number> {
    if (promotion.type !== PromotionType.DISCOUNT) {
      return amount;
    }

    if (promotion.discountType === 'percentage') {
      return amount - (amount * promotion.discountValue) / 100;
    } else if (promotion.discountType === 'fixed_amount') {
      return Math.max(0, amount - promotion.discountValue);
    }

    return amount;
  }

  async getPromotionStats(branchId: string): Promise<any> {
    const totalPromotions = await this.promotionRepository.count({
      where: { branchId },
    });

    const activePromotions = await this.promotionRepository.count({
      where: { branchId, isActive: true },
    });

    const discountPromotions = await this.promotionRepository.count({
      where: { branchId, type: PromotionType.DISCOUNT },
    });

    const packagePromotions = await this.promotionRepository.count({
      where: { branchId, type: PromotionType.PACKAGE },
    });

    return {
      total: totalPromotions,
      active: activePromotions,
      discounts: discountPromotions,
      packages: packagePromotions,
    };
  }
}
