import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLedger, TransactionType } from '../entities/stock-ledger.entity';
import { Product } from '../../products/entities/product.entity';
import { ActivityLogService } from '../../activity-log/services/activity-log.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockLedger)
    private stockLedgerRepository: Repository<StockLedger>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private activityLogService: ActivityLogService,
  ) {}

  async addStock(
    productId: string,
    quantity: number,
    costPrice: number,
    branchId: string | null,
    createdById: string,
    notes?: string,
  ): Promise<StockLedger> {
    const product = await this.getProduct(productId);
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const nextBalance = product.stockQuantity + quantity;
    await this.productRepository.update(product.id, { stockQuantity: nextBalance });

    const ledgerEntry = this.stockLedgerRepository.create({
      productId,
      transactionType: TransactionType.IN,
      quantity,
      balance: nextBalance,
      costPrice,
      notes,
      branchId,
      createdById,
    });

    const saved = await this.stockLedgerRepository.save(ledgerEntry);
    await this.activityLogService.log({
      action: 'inventory.add_stock',
      entityType: 'product',
      entityId: product.id,
      severity: 'info',
      branchId,
      createdById,
      details: { productName: product.name, quantity, nextBalance, notes: notes || null },
    });
    return saved;
  }

  async removeStock(
    productId: string,
    quantity: number,
    branchId: string | null,
    createdById: string,
    notes?: string,
  ): Promise<StockLedger> {
    const product = await this.getProduct(productId);
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (product.stockQuantity < quantity) {
      throw new BadRequestException(`Insufficient stock for ${product.name}`);
    }

    const nextBalance = product.stockQuantity - quantity;
    await this.productRepository.update(product.id, { stockQuantity: nextBalance });

    const ledgerEntry = this.stockLedgerRepository.create({
      productId,
      transactionType: TransactionType.OUT,
      quantity,
      balance: nextBalance,
      notes,
      branchId,
      createdById,
    });

    const saved = await this.stockLedgerRepository.save(ledgerEntry);
    await this.activityLogService.log({
      action: 'inventory.remove_stock',
      entityType: 'product',
      entityId: product.id,
      severity: 'warning',
      branchId,
      createdById,
      details: { productName: product.name, quantity, nextBalance, notes: notes || null },
    });
    return saved;
  }

  async adjustStock(
    productId: string,
    quantity: number,
    branchId: string | null,
    createdById: string,
    notes?: string,
  ): Promise<StockLedger> {
    const product = await this.getProduct(productId);
    if (quantity < 0) {
      throw new BadRequestException('Adjusted balance cannot be negative');
    }

    await this.productRepository.update(product.id, { stockQuantity: quantity });

    const ledgerEntry = this.stockLedgerRepository.create({
      productId,
      transactionType: TransactionType.ADJUSTMENT,
      quantity: Math.abs(quantity - product.stockQuantity),
      balance: quantity,
      notes,
      branchId,
      createdById,
    });

    const saved = await this.stockLedgerRepository.save(ledgerEntry);
    await this.activityLogService.log({
      action: 'inventory.adjust_stock',
      entityType: 'product',
      entityId: product.id,
      severity: 'warning',
      branchId,
      createdById,
      details: {
        productName: product.name,
        previousBalance: product.stockQuantity,
        adjustedBalance: quantity,
        delta: quantity - product.stockQuantity,
        notes: notes || null,
      },
    });
    return saved;
  }

  async getStockHistory(productId: string): Promise<StockLedger[]> {
    return this.stockLedgerRepository.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCurrentStock(productId: string): Promise<number> {
    const product = await this.getProduct(productId);
    return product.stockQuantity;
  }

  private async getProduct(productId: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}
