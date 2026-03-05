import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KdsService } from './services/kds.service';
import { KdsController } from './controllers/kds.controller';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([KitchenOrder]), RealtimeModule],
  controllers: [KdsController],
  providers: [KdsService],
  exports: [KdsService],
})
export class KdsModule {}
