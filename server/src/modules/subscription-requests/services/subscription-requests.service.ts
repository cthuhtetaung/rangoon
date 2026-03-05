import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addMonths } from 'date-fns';
import { SubscriptionRequest } from '../entities/subscription-request.entity';
import { UsersService } from '../../users/services/users.service';
import { User } from '../../users/entities/user.entity';
import { ActivityLogService } from '../../activity-log/services/activity-log.service';

const PLAN_PRICES: Record<number, number> = {
  1: 15000,
  3: 42000,
  6: 78000,
  12: 144000,
};

type CreateRequestInput = {
  planMonths: number;
  paymentMethod: string;
  txLast5?: string;
  payerShopName: string;
  payerPhone: string;
  proofImageDataUrl: string;
};

type ReviewInput = {
  decision: 'approved' | 'rejected';
  reviewNote?: string;
};

@Injectable()
export class SubscriptionRequestsService {
  constructor(
    @InjectRepository(SubscriptionRequest)
    private readonly subscriptionRequestsRepository: Repository<SubscriptionRequest>,
    private readonly usersService: UsersService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  private validatePlanMonths(planMonths: number): number {
    const normalized = Number(planMonths);
    if (![1, 3, 6, 12].includes(normalized)) {
      throw new BadRequestException('Invalid plan. Allowed values: 1, 3, 6, 12 months.');
    }
    return normalized;
  }

  private validateTxLast5(txLast5: string): string {
    const normalized = String(txLast5 || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(normalized)) {
      throw new BadRequestException('Transaction last 5 must be exactly 5 letters/numbers.');
    }
    return normalized;
  }

  private normalizePayerShopName(name: string): string {
    const normalized = String(name || '').trim();
    if (!normalized) {
      throw new BadRequestException('Shop name is required.');
    }
    if (normalized.length > 150) {
      throw new BadRequestException('Shop name is too long.');
    }
    return normalized;
  }

  private normalizePayerPhone(phone: string): string {
    const normalized = String(phone || '').trim();
    if (!normalized) {
      throw new BadRequestException('Phone number is required.');
    }
    if (normalized.length > 30) {
      throw new BadRequestException('Phone number is too long.');
    }
    return normalized;
  }

  private resolveTxLast5(txLast5: string | undefined, payerPhone: string): string {
    const candidate = String(txLast5 || '').trim();
    if (candidate) {
      return this.validateTxLast5(candidate);
    }
    const cleaned = String(payerPhone || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (cleaned.length < 5) {
      throw new BadRequestException('Phone number must contain at least 5 letters/numbers.');
    }
    return cleaned.slice(-5);
  }

  private validateProofImageDataUrl(proofImageDataUrl: string): string {
    const normalized = String(proofImageDataUrl || '').trim();
    if (!normalized.startsWith('data:image/')) {
      throw new BadRequestException('Proof screenshot must be an image.');
    }
    if (normalized.length > 8_000_000) {
      throw new BadRequestException('Proof screenshot is too large.');
    }
    return normalized;
  }

  async createRequest(requester: User, input: CreateRequestInput): Promise<SubscriptionRequest> {
    const requesterRole = String(requester?.role || '').toLowerCase();
    if (requesterRole !== 'owner') {
      throw new ForbiddenException('Only owner can submit subscription request.');
    }

    const planMonths = this.validatePlanMonths(input.planMonths);
    const payerShopName = this.normalizePayerShopName(input.payerShopName);
    const payerPhone = this.normalizePayerPhone(input.payerPhone);
    const txLast5 = this.resolveTxLast5(input.txLast5, payerPhone);
    const proofImageDataUrl = this.validateProofImageDataUrl(input.proofImageDataUrl);
    const amountMmk = PLAN_PRICES[planMonths];

    const existingPending = await this.subscriptionRequestsRepository.findOne({
      where: { ownerUserId: requester.id, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    if (existingPending) {
      throw new BadRequestException('Pending subscription request already exists.');
    }

    const entry = this.subscriptionRequestsRepository.create({
      ownerUserId: requester.id,
      planMonths,
      amountMmk,
      paymentMethod: String(input.paymentMethod || '').trim(),
      payerShopName,
      payerPhone,
      txLast5,
      proofImageDataUrl,
      status: 'pending',
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
    });
    const saved = await this.subscriptionRequestsRepository.save(entry);

    await this.activityLogService.log({
      action: 'Subscription Request Submitted',
      entityType: 'subscription_request',
      entityId: saved.id,
      severity: 'info',
      branchId: requester.branchId || null,
      createdById: requester.id,
      details: {
        planMonths: saved.planMonths,
        amountMmk: saved.amountMmk,
        paymentMethod: saved.paymentMethod,
        payerShopName: saved.payerShopName,
        payerPhone: saved.payerPhone,
        txLast5: saved.txLast5,
      },
    });
    return saved;
  }

  async listMine(ownerUserId: string): Promise<SubscriptionRequest[]> {
    return this.subscriptionRequestsRepository.find({
      where: { ownerUserId },
      order: { createdAt: 'DESC' },
    });
  }

  async listAll(status?: string): Promise<SubscriptionRequest[]> {
    if (!status) {
      return this.subscriptionRequestsRepository.find({
        relations: ['ownerUser', 'reviewedBy'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.subscriptionRequestsRepository.find({
      where: { status: String(status).toLowerCase() as any },
      relations: ['ownerUser', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async reviewRequest(id: string, reviewer: User, input: ReviewInput): Promise<SubscriptionRequest> {
    const reviewerRole = String(reviewer?.role || '').toLowerCase();
    if (reviewerRole !== 'admin') {
      throw new ForbiddenException('Only admin can review subscription requests.');
    }

    const decision = String(input.decision || '').toLowerCase();
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new BadRequestException('Decision must be approved or rejected.');
    }

    const entry = await this.subscriptionRequestsRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Subscription request not found.');
    }
    if (entry.status !== 'pending') {
      throw new BadRequestException('Subscription request already reviewed.');
    }

    entry.status = decision as 'approved' | 'rejected';
    entry.reviewedById = reviewer.id;
    entry.reviewedAt = new Date();
    entry.reviewNote = input.reviewNote ? String(input.reviewNote).trim() : null;
    const saved = await this.subscriptionRequestsRepository.save(entry);

    if (saved.status === 'approved') {
      const ownerUser = await this.usersService.findById(saved.ownerUserId);
      if (!ownerUser) {
        throw new NotFoundException('Owner account not found.');
      }

      const now = new Date();
      const currentEndAt = ownerUser.subscriptionEndAt ? new Date(ownerUser.subscriptionEndAt) : null;
      const baseStart = currentEndAt && currentEndAt.getTime() > now.getTime() ? currentEndAt : now;
      const endAt = addMonths(baseStart, saved.planMonths);

      await this.usersService.update(saved.ownerUserId, {
        subscriptionPlan: saved.planMonths >= 12 ? 'yearly' : 'monthly',
        subscriptionStatus: 'active',
        subscriptionStartAt: now,
        subscriptionEndAt: endAt,
      });
    }

    await this.activityLogService.log({
      action: saved.status === 'approved' ? 'Subscription Request Approved' : 'Subscription Request Rejected',
      entityType: 'subscription_request',
      entityId: saved.id,
      severity: saved.status === 'approved' ? 'info' : 'warning',
      branchId: reviewer.branchId || null,
      createdById: reviewer.id,
      details: {
        ownerUserId: saved.ownerUserId,
        planMonths: saved.planMonths,
        amountMmk: saved.amountMmk,
        reviewNote: saved.reviewNote,
      },
    });

    return saved;
  }
}
