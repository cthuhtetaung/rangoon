import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformSetting } from './entities/platform-setting.entity';
import { PlatformSettingsService } from './services/platform-settings.service';
import { PlatformSettingsController } from './controllers/platform-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting])],
  providers: [PlatformSettingsService],
  controllers: [PlatformSettingsController],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}

