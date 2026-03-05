import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './services/reports.service';
import { ReportsController } from './controllers/reports.controller';
import { Order } from '../pos/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Product } from '../products/entities/product.entity';
import { Expense } from '../expense/entities/expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Payment, Product, Expense])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
