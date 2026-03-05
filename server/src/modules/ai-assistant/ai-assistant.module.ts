import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../pos/entities/order.entity';
import { OrderItem } from '../pos/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Expense } from '../expense/entities/expense.entity';
import { AiAssistantController } from './controllers/ai-assistant.controller';
import { AiAssistantService } from './services/ai-assistant.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, Expense])],
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
})
export class AiAssistantModule {}
