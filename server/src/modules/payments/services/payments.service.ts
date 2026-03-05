import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentMethod, PaymentProvider } from '../entities/payment-method.entity';
import { Order, OrderStatus } from '../../pos/entities/order.entity';

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializePaymentMethods();
  }

  async initializePaymentMethods(): Promise<void> {
    const defaultMethods = [
      { name: 'Cash', provider: PaymentProvider.CASH, description: 'Cash payment' },
      { name: 'KBZPay', provider: PaymentProvider.KBZPAY, description: 'KBZ Bank mobile payment' },
      { name: 'WavePay', provider: PaymentProvider.WAVEPAY, description: 'Wave Money mobile payment' },
      { name: 'CB Pay', provider: PaymentProvider.CBPAY, description: 'CB Bank mobile payment' },
      { name: 'Aya Pay', provider: PaymentProvider.AYAPAY, description: 'Aya Bank mobile payment' },
      { name: 'MPU', provider: PaymentProvider.MPU, description: 'Myanmar Payment Union card payment' },
    ];

    for (const method of defaultMethods) {
      const existing = await this.paymentMethodRepository.findOne({
        where: { provider: method.provider },
      });

      if (!existing) {
        const paymentMethod = this.paymentMethodRepository.create(method);
        await this.paymentMethodRepository.save(paymentMethod);
      }
    }
  }

  async createPayment(createPaymentDto: any): Promise<Payment | null> {
    const paymentData = {
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
    };

    const payment = this.paymentRepository.create(paymentData);
    const savedPayment = await this.paymentRepository.save(payment);
    if (Array.isArray(savedPayment)) {
      return savedPayment[0] as unknown as Payment;
    }
    return savedPayment as unknown as Payment;
  }

  async processPayment(paymentId: string, transactionId?: string): Promise<Payment | null> {
    await this.paymentRepository.update(paymentId, {
      status: PaymentStatus.COMPLETED,
      transactionId,
    });

    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (payment?.orderId) {
      await this.orderRepository.update(payment.orderId, { status: OrderStatus.PAID });
    }

    return this.paymentRepository.findOne({ where: { id: paymentId } });
  }

  async failPayment(paymentId: string): Promise<Payment | null> {
    await this.paymentRepository.update(paymentId, {
      status: PaymentStatus.FAILED,
    });

    return this.paymentRepository.findOne({ where: { id: paymentId } });
  }

  async refundPayment(paymentId: string): Promise<Payment | null> {
    await this.paymentRepository.update(paymentId, {
      status: PaymentStatus.REFUNDED,
    });

    return this.paymentRepository.findOne({ where: { id: paymentId } });
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { id },
      relations: ['paymentMethod'],
    });
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { orderId },
      relations: ['paymentMethod'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }
}
