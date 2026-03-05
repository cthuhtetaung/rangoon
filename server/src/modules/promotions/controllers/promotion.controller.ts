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
  Request,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { PromotionService } from '../services/promotion.service';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { PromotionType } from '../entities/promotion.entity';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createPromotionDto: CreatePromotionDto, @Request() req: any) {
    const branchId = this.resolveBranchScope(req, createPromotionDto.branchId);
    return this.promotionService.create({
      ...createPromotionDto,
      branchId: branchId || createPromotionDto.branchId,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findAll(@Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.promotionService.findAll(branchId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.promotionService.findOne(id, branchId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
    @Request() req: any,
  ) {
    const branchId = this.resolveBranchScope(req, updatePromotionDto.branchId);
    return this.promotionService.update(id, {
      ...updatePromotionDto,
      branchId: branchId || updatePromotionDto.branchId,
    }, branchId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const branchId = this.resolveBranchScope(req);
    return this.promotionService.remove(id, branchId);
  }

  @Get('branch/:branchId/active')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getActivePromotions(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Request() req: any,
    @Query('date') date?: string,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.promotionService.getActivePromotions(
      scopedBranchId || branchId,
      date ? new Date(date) : new Date(),
    );
  }

  @Get('branch/:branchId/type/:type')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getPromotionsByType(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('type') type: PromotionType,
    @Request() req: any,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.promotionService.getPromotionsByType(scopedBranchId || branchId, type);
  }

  @Get('branch/:branchId/upcoming')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getUpcomingPromotions(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Request() req: any,
    @Query('days') days: number = 7,
  ) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.promotionService.getUpcomingPromotions(scopedBranchId || branchId, days);
  }

  @Get('branch/:branchId/expired')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getExpiredPromotions(@Param('branchId', ParseUUIDPipe) branchId: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.promotionService.getExpiredPromotions(scopedBranchId || branchId);
  }

  @Get('branch/:branchId/stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getPromotionStats(@Param('branchId', ParseUUIDPipe) branchId: string, @Request() req: any) {
    const scopedBranchId = this.resolveBranchScope(req, branchId);
    return this.promotionService.getPromotionStats(scopedBranchId || branchId);
  }
}
