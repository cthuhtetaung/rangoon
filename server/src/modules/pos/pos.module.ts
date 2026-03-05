import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosService } from './services/pos.service';
import { PosController } from './controllers/pos.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/entities/payment-method.entity';
import { Product } from '../products/entities/product.entity';
import { StockLedger } from '../inventory/entities/stock-ledger.entity';
import { KitchenOrder } from '../kds/entities/kitchen-order.entity';
import { User } from '../users/entities/user.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment, PaymentMethod, Product, StockLedger, KitchenOrder, User]),
    ActivityLogModule,
    RealtimeModule,
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
