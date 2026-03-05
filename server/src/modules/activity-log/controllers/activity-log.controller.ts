import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ActivityLogService } from '../services/activity-log.service';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async getLogs(@Query() query: any, @Request() req: any) {
    return this.activityLogService.findAll(query || {}, {
      requesterRole: req?.user?.role,
      requesterBranchId: req?.user?.branchId || null,
    });
  }
}
