import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from '../services/payments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { isUUID } from 'class-validator';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async createPayment(@Body() createPaymentDto: any, @Request() req: any) {
    const branchId =
      createPaymentDto.branchId && isUUID(createPaymentDto.branchId) ? createPaymentDto.branchId : req.user?.branchId || null;
    const createdById =
      createPaymentDto.createdById && isUUID(createPaymentDto.createdById) ? createPaymentDto.createdById : req.user?.id;

    return this.paymentsService.createPayment({
      ...createPaymentDto,
      branchId,
      createdById,
    });
  }

  @Post('process/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async processPayment(@Param('id') id: string, @Body('transactionId') transactionId?: string) {
    return this.paymentsService.processPayment(id, transactionId);
  }

  @Post('fail/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async failPayment(@Param('id') id: string) {
    return this.paymentsService.failPayment(id);
  }

  @Post('refund/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async refundPayment(@Param('id') id: string) {
    return this.paymentsService.refundPayment(id);
  }

  @Get('methods')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getAllPaymentMethods() {
    return this.paymentsService.getAllPaymentMethods();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getPaymentById(@Param('id') id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Get('order/:orderId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getPaymentsByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentsByOrderId(orderId);
  }

}
