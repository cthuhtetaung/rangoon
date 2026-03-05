import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SubscriptionRequestsService } from '../services/subscription-requests.service';

@Controller('subscription-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionRequestsController {
  constructor(private readonly subscriptionRequestsService: SubscriptionRequestsService) {}

  @Post()
  @Roles('owner')
  async createRequest(
    @Request() req: any,
    @Body()
    payload: {
      planMonths: number;
      paymentMethod: string;
      txLast5?: string;
      payerShopName: string;
      payerPhone: string;
      proofImageDataUrl: string;
    },
  ) {
    return this.subscriptionRequestsService.createRequest(req.user, payload);
  }

  @Get('mine')
  @Roles('owner')
  async listMine(@Request() req: any) {
    return this.subscriptionRequestsService.listMine(req.user.id);
  }

  @Get()
  @Roles('admin')
  async listAll(@Query('status') status?: string) {
    return this.subscriptionRequestsService.listAll(status);
  }

  @Put(':id/review')
  @Roles('admin')
  async review(
    @Param('id') id: string,
    @Request() req: any,
    @Body()
    payload: {
      decision: 'approved' | 'rejected';
      reviewNote?: string;
    },
  ) {
    return this.subscriptionRequestsService.reviewRequest(id, req.user, payload);
  }
}
