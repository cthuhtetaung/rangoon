import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';

type ActivityLogInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  severity?: 'info' | 'warning' | 'critical';
  details?: Record<string, any> | null;
  branchId?: string | null;
  createdById?: string | null;
};

type ActivityLogQuery = {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  action?: string;
  severity?: string;
  entityType?: string;
  limit?: string | number;
  branchId?: string;
};

type ActivityLogContext = {
  requesterRole?: string;
  requesterBranchId?: string | null;
};

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async log(input: ActivityLogInput): Promise<void> {
    const entry = this.activityLogRepository.create({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      severity: input.severity || 'info',
      details: input.details || null,
      branchId: input.branchId || null,
      createdById: input.createdById || null,
    });
    await this.activityLogRepository.save(entry);
  }

  async findAll(query: ActivityLogQuery, context: ActivityLogContext = {}): Promise<ActivityLog[]> {
    const qb = this.activityLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.createdBy', 'createdBy')
      .orderBy('log.createdAt', 'DESC');

    const requesterRole = String(context.requesterRole || '').toLowerCase();
    const requesterBranchId = context.requesterBranchId || null;
    if (requesterRole !== 'admin') {
      if (!requesterBranchId) {
        return [];
      }
      qb.andWhere('log.branchId = :requesterBranchId', { requesterBranchId });
    } else if (query.branchId) {
      qb.andWhere('log.branchId = :branchId', { branchId: query.branchId });
    }

    if (query.userId) qb.andWhere('log.createdById = :userId', { userId: query.userId });
    if (query.action) qb.andWhere('log.action ILIKE :action', { action: `%${query.action}%` });
    if (query.entityType) qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    if (query.severity) qb.andWhere('log.severity = :severity', { severity: query.severity });
    if (query.dateFrom) qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: new Date(`${query.dateFrom}T00:00:00`) });
    if (query.dateTo) qb.andWhere('log.createdAt <= :dateTo', { dateTo: new Date(`${query.dateTo}T23:59:59.999`) });

    const limit = Number(query.limit || 200);
    qb.take(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 200);

    return qb.getMany();
  }
}
