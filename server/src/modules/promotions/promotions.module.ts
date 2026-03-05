import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { Product } from '../products/entities/product.entity';
import { PromotionService } from './services/promotion.service';
import { PromotionController } from './controllers/promotion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, Product])],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionsModule {}