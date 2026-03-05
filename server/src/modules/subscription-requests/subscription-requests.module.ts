import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionRequest } from './entities/subscription-request.entity';
import { SubscriptionRequestsService } from './services/subscription-requests.service';
import { SubscriptionRequestsController } from './controllers/subscription-requests.controller';
import { UsersModule } from '../users/users.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionRequest]), UsersModule, ActivityLogModule],
  providers: [SubscriptionRequestsService],
  controllers: [SubscriptionRequestsController],
  exports: [SubscriptionRequestsService],
})
export class SubscriptionRequestsModule {}

