import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffService } from './services/staff.service';
import { StaffController } from './controllers/staff.controller';
import { Staff } from './entities/staff.entity';
import { Commission } from './entities/commission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, Commission])],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}