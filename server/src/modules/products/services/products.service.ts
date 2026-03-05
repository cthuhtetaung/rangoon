import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { BomItem, Product, ProductType } from '../entities/product.entity';
import { ActivityLogService } from '../../activity-log/services/activity-log.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private activityLogService: ActivityLogService,
  ) {}

  async create(createDto: any): Promise<Product> {
    const productType: ProductType = createDto.productType === 'ingredient' ? 'ingredient' : 'sellable';
    const usesBom = Boolean(createDto.usesBom);
    const bom = usesBom ? this.normalizeBom(createDto.bom) : null;
    const requestedSku = this.normalizeSkuInput(createDto.sku);
    const sku = requestedSku || (await this.generateSku(createDto.name, productType));

    if (usesBom && productType !== 'sellable') {
      throw new BadRequestException('Only sellable products can use BOM');
    }

    if (requestedSku) {
      const existingSku = await this.productRepository.findOne({ where: { sku } });
      if (existingSku) {
        throw new BadRequestException('SKU already exists');
      }
    }

    const product = this.productRepository.create({
      name: createDto.name,
      sku,
      description: createDto.description,
      price: Number(createDto.price || 0),
      stockQuantity: Number(createDto.stockQuantity || 0),
      isActive: createDto.isActive ?? true,
      productType,
      usesBom,
      sendToKitchen: productType === 'sellable' ? Boolean(createDto.sendToKitchen) : false,
      menuLabel: productType === 'sellable' ? this.normalizeMenuLabelInput(createDto.menuLabel) : null,
      bom,
      branchId: createDto.branchId || null,
      categoryId: createDto.categoryId || null,
    });

    return this.productRepository.save(product);
  }

  async findAll(query: any): Promise<Product[]> {
    const qb = this.productRepository.createQueryBuilder('product');

    if (query.activeOnly !== 'false') {
      qb.andWhere('product.isActive = :isActive', { isActive: true });
    }

    if (query.productType) {
      qb.andWhere('product.productType = :productType', { productType: query.productType });
    }

    if (query.forPos === 'true') {
      qb.andWhere('product.productType = :sellable', { sellable: 'sellable' });
    }

    if (query.menuLabel) {
      const normalizedMenuLabel = this.normalizeMenuLabelInput(query.menuLabel);
      if (normalizedMenuLabel) {
        qb.andWhere('LOWER(product.menuLabel) = LOWER(:menuLabel)', {
          menuLabel: normalizedMenuLabel,
        });
      }
    }

    if (query.branchId) {
      qb.andWhere('product.branchId = :branchId', { branchId: query.branchId });
    }

    qb.orderBy('product.name', 'ASC');
    return qb.getMany();
  }

  async findById(id: string, branchId?: string | null): Promise<Product> {
    const where: any = { id };
    if (branchId) {
      where.branchId = branchId;
    }
    const product = await this.productRepository.findOne({ where });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, updateDto: any, branchId?: string | null): Promise<Product> {
    const existing = await this.findById(id, branchId);

    const updates: Partial<Product> = {
      ...updateDto,
    };

    if (updateDto.price !== undefined) {
      updates.price = Number(updateDto.price);
    }

    if (updateDto.stockQuantity !== undefined) {
      updates.stockQuantity = Number(updateDto.stockQuantity);
    }

    if (updateDto.usesBom !== undefined) {
      updates.usesBom = Boolean(updateDto.usesBom);
    }

    if (updateDto.sendToKitchen !== undefined) {
      updates.sendToKitchen = existing.productType === 'sellable' ? Boolean(updateDto.sendToKitchen) : false;
    }

    if (updateDto.menuLabel !== undefined) {
      updates.menuLabel = existing.productType === 'sellable' ? this.normalizeMenuLabelInput(updateDto.menuLabel) : null;
    }

    if (updateDto.bom !== undefined) {
      updates.bom = updateDto.usesBom ? this.normalizeBom(updateDto.bom) : null;
    }

    if (updateDto.sku !== undefined) {
      const normalizedSku = this.normalizeSkuInput(updateDto.sku);
      if (!normalizedSku) {
        throw new BadRequestException('SKU cannot be empty');
      }
      const skuOwner = await this.productRepository.findOne({ where: { sku: normalizedSku } });
      if (skuOwner && skuOwner.id !== id) {
        throw new BadRequestException('SKU already exists');
      }
      updates.sku = normalizedSku;
    }

    await this.productRepository.update(id, updates);
    const updated = await this.findById(id, branchId);

    const priceChanged =
      updateDto.price !== undefined && Number(existing.price) !== Number(updated.price);
    const kdsChanged =
      updateDto.sendToKitchen !== undefined && Boolean(existing.sendToKitchen) !== Boolean(updated.sendToKitchen);
    const strategyChanged =
      updateDto.usesBom !== undefined && Boolean(existing.usesBom) !== Boolean(updated.usesBom);

    const menuLabelChanged =
      updateDto.menuLabel !== undefined && String(existing.menuLabel || '') !== String(updated.menuLabel || '');

    if (priceChanged || kdsChanged || strategyChanged || menuLabelChanged || updateDto.name !== undefined || updateDto.sku !== undefined) {
      await this.activityLogService.log({
        action: 'product.update',
        entityType: 'product',
        entityId: id,
        severity: priceChanged ? 'warning' : 'info',
        branchId: existing.branchId || null,
        details: {
          productName: existing.name,
          changes: {
            name: updateDto.name !== undefined ? { from: existing.name, to: updated.name } : undefined,
            sku: updateDto.sku !== undefined ? { from: existing.sku, to: updated.sku } : undefined,
            price: priceChanged ? { from: Number(existing.price), to: Number(updated.price) } : undefined,
            sendToKitchen: kdsChanged ? { from: Boolean(existing.sendToKitchen), to: Boolean(updated.sendToKitchen) } : undefined,
            usesBom: strategyChanged ? { from: Boolean(existing.usesBom), to: Boolean(updated.usesBom) } : undefined,
            menuLabel: menuLabelChanged ? { from: existing.menuLabel || null, to: updated.menuLabel || null } : undefined,
          },
        },
      });
    }

    return updated;
  }

  async setBom(productId: string, bom: any[], branchId?: string | null): Promise<Product> {
    const product = await this.findById(productId, branchId);
    if (product.productType !== 'sellable') {
      throw new BadRequestException('BOM only supports sellable products');
    }

    const normalizedBom = this.normalizeBom(bom);

    const ingredientIds = normalizedBom.map((item) => item.ingredientProductId);
    const ingredients = await this.productRepository.find({ where: { id: In(ingredientIds) } });
    const ingredientMap = new Map(ingredients.map((it) => [it.id, it]));

    for (const item of normalizedBom) {
      const ingredient = ingredientMap.get(item.ingredientProductId);
      if (!ingredient) {
        throw new BadRequestException(`Ingredient not found: ${item.ingredientProductId}`);
      }
      if (ingredient.productType !== 'ingredient') {
        throw new BadRequestException(`Product ${ingredient.name} is not an ingredient`);
      }
    }

    await this.productRepository.update(productId, {
      usesBom: normalizedBom.length > 0,
      bom: normalizedBom,
    });

    return this.findById(productId, branchId);
  }

  private normalizeBom(rawBom: any): BomItem[] {
    if (!Array.isArray(rawBom)) {
      return [];
    }

    return rawBom
      .map((item) => ({
        ingredientProductId: String(item.ingredientProductId || '').trim(),
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.ingredientProductId && Number.isFinite(item.quantity) && item.quantity > 0);
  }

  private normalizeSkuInput(value: any): string {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
  }

  private normalizeMenuLabelInput(value: any): string | null {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return null;
    if (['food', 'အစား', 'စားစရာ'].includes(raw)) return 'food';
    if (['drink', 'beverage', 'အသောက်', 'သောက်စရာ'].includes(raw)) return 'drink';
    if (['other', 'others', 'အခြား'].includes(raw)) return 'other';
    return null;
  }

  private buildSkuBase(name: string, productType: ProductType): string {
    const prefix = productType === 'ingredient' ? 'ING' : 'PRD';
    const normalized = String(name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18);

    return normalized ? `${prefix}-${normalized}` : prefix;
  }

  private async generateSku(name: string, productType: ProductType): Promise<string> {
    const base = this.buildSkuBase(name, productType);
    const candidates = await this.productRepository.find({
      where: { sku: Like(`${base}%`) },
      select: ['sku'],
    });
    const used = new Set(candidates.map((item) => item.sku));

    for (let i = 1; i < 10000; i++) {
      const candidate = `${base}-${String(i).padStart(3, '0')}`;
      if (!used.has(candidate)) {
        return candidate;
      }
    }

    throw new BadRequestException('Unable to generate SKU, please enter SKU manually');
  }
}
