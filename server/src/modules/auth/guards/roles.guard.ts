import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FeaturePermission } from '../../../common/constants/permission.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private inferPermissionFromRequest(req: any): FeaturePermission | null {
    const path = String(req?.originalUrl || req?.url || '').toLowerCase();
    const method = String(req?.method || 'GET').toUpperCase();

    if (path.startsWith('/reports')) return 'reports';
    if (path.startsWith('/ai-assistant')) return 'ai_assistant';
    if (path.startsWith('/activity-logs')) return 'activity_logs';
    if (path.startsWith('/inventory')) return 'inventory';
    if (path.startsWith('/kds')) return 'kds';
    if (path.startsWith('/promotions')) return 'promotions';
    if (path.startsWith('/reservations')) return 'reservations';
    if (path.startsWith('/staff')) return 'staff';
    if (path.startsWith('/branches')) return 'branches';
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/payments')) return 'payments';
    if (path.startsWith('/purchase-orders') || path.startsWith('/suppliers')) return 'purchase';
    if (path.startsWith('/expenses') || path.startsWith('/expense-categories')) return 'expense';
    if (path.startsWith('/products')) return 'inventory';

    if (path.startsWith('/pos/orders') && method === 'GET') return 'orders';
    if (path.startsWith('/pos')) return 'pos';

    return null;
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    const currentRole = String(user?.role || '').toLowerCase();
    if (currentRole === 'admin') {
      return true;
    }
    if (requiredRoles.some((role) => currentRole === String(role || '').toLowerCase())) {
      return true;
    }

    const permission = this.inferPermissionFromRequest(context.switchToHttp().getRequest());
    if (!permission) {
      return false;
    }
    const extraPermissions = Array.isArray(user?.extraPermissions) ? user.extraPermissions.map((p: any) => String(p)) : [];
    return extraPermissions.includes(permission);
  }
}
