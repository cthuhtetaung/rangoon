import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from '../entities/platform-setting.entity';

export type SubscriptionMode = 'free' | 'subscription';

@Injectable()
export class PlatformSettingsService {
  private static readonly SUBSCRIPTION_MODE_KEY = 'subscription_mode';

  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingsRepository: Repository<PlatformSetting>,
  ) {}

  async getSubscriptionMode(): Promise<SubscriptionMode> {
    const setting = await this.settingsRepository.findOne({
      where: { key: PlatformSettingsService.SUBSCRIPTION_MODE_KEY },
    });
    const value = String(setting?.value || 'free').toLowerCase();
    return value === 'subscription' ? 'subscription' : 'free';
  }

  async setSubscriptionMode(mode: SubscriptionMode, updatedById?: string | null): Promise<SubscriptionMode> {
    const normalized: SubscriptionMode = mode === 'subscription' ? 'subscription' : 'free';
    let setting = await this.settingsRepository.findOne({
      where: { key: PlatformSettingsService.SUBSCRIPTION_MODE_KEY },
    });
    if (!setting) {
      setting = this.settingsRepository.create({
        key: PlatformSettingsService.SUBSCRIPTION_MODE_KEY,
        value: normalized,
        updatedById: updatedById || null,
      });
    } else {
      setting.value = normalized;
      setting.updatedById = updatedById || null;
    }
    await this.settingsRepository.save(setting);
    return normalized;
  }
}

