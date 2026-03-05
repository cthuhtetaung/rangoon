import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { Product } from '../products/entities/product.entity';
import { SupplierService } from './services/supplier.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { SupplierController } from './controllers/supplier.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, PurchaseOrder, PurchaseItem, Product])],
  controllers: [SupplierController, PurchaseOrderController],
  providers: [SupplierService, PurchaseOrderService],
  exports: [SupplierService, PurchaseOrderService],
})
export class PurchaseModule {}