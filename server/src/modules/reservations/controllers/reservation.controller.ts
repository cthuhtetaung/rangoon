import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ReservationService } from '../services/reservation.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationQueryDto } from '../dto/reservation-query.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  private resolveBranchScope(req: any, requestedBranchId?: string): string | undefined {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role === UserRole.ADMIN) {
      return requestedBranchId;
    }
    const requesterBranchId = req?.user?.branchId || null;
    if (!requesterBranchId) {
      throw new ForbiddenException('Branch is required for this account');
    }
    if (requestedBranchId && requestedBranchId !== requesterBranchId) {
      throw new ForbiddenException('Cannot access another branch');
    }
    return requesterBranchId;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  create(@Body() createReservationDto: CreateReservationDto, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req, createReservationDto.branchId);
    return this.reservationService.create({
      ...createReservationDto,
      branchId: scopedBranchId || createReservationDto.branchId,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findAll(@Query() query: ReservationQueryDto, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req, query.branchId);
    return this.reservationService.findAll({
      ...query,
      branchId: scopedBranchId,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req);
    return this.reservationService.findOne(id, scopedBranchId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @Request() req: any,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, updateReservationDto.branchId);
    return this.reservationService.update(
      id,
      {
        ...updateReservationDto,
        branchId: scopedBranchId || updateReservationDto.branchId,
      },
      scopedBranchId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req);
    return this.reservationService.remove(id, scopedBranchId);
  }

  @Get('branch/:branchId/upcoming')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getUpcomingReservations(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('days') days: number = 7,
    @Request() req: any,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.reservationService.getUpcomingReservations(scopedBranchId || branchId, days);
  }

  @Get('branch/:branchId/stats')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getReservationStats(@Param('branchId', ParseUUIDPipe) branchId: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.reservationService.getReservationStats(scopedBranchId || branchId);
  }

  @Get('branch/:branchId/date-range')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findByDateRange(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.reservationService.findByDateRange(
      scopedBranchId || branchId,
      new Date(startDate),
      new Date(endDate),
      type as any,
    );
  }
}
