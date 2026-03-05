import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PosModule } from './modules/pos/pos.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { KdsModule } from './modules/kds/kds.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BranchesModule } from './modules/branches/branches.module';
import { StaffModule } from './modules/staff/staff.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { ProductsModule } from './modules/products/products.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { PlatformSettingsModule } from './modules/platform-settings/platform-settings.module';
import { SubscriptionRequestsModule } from './modules/subscription-requests/subscription-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'cafemanage',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize:
        process.env.TYPEORM_SYNC === 'true'
          ? true
          : process.env.TYPEORM_SYNC === 'false'
            ? false
            : process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    UsersModule,
    PosModule,
    InventoryModule,
    KdsModule,
    PaymentsModule,
    ReportsModule,
    BranchesModule,
    StaffModule,
    ReservationsModule,
    PromotionsModule,
    PurchaseModule,
    ExpenseModule,
    ProductsModule,
    ActivityLogModule,
    RealtimeModule,
    AiAssistantModule,
    PlatformSettingsModule,
    SubscriptionRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
