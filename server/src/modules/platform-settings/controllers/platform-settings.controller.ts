import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PlatformSettingsService, type SubscriptionMode } from '../services/platform-settings.service';

@Controller('platform-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PlatformSettingsController {
  constructor(private readonly platformSettingsService: PlatformSettingsService) {}

  @Get('subscription-mode')
  async getSubscriptionMode() {
    const mode = await this.platformSettingsService.getSubscriptionMode();
    return { mode };
  }

  @Put('subscription-mode')
  async setSubscriptionMode(@Body('mode') mode: SubscriptionMode, @Request() req: any) {
    const saved = await this.platformSettingsService.setSubscriptionMode(mode, req?.user?.id || null);
    return { mode: saved };
  }
}

