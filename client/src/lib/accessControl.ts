export const FEATURE_PERMISSIONS = [
  'dashboard',
  'pos',
  'orders',
  'inventory',
  'kds',
  'expense',
  'promotions',
  'reservations',
  'staff',
  'reports',
  'ai_assistant',
  'activity_logs',
  'platform',
  'branches',
  'purchase',
  'payments',
  'users',
] as const;

export type FeaturePermission = (typeof FEATURE_PERMISSIONS)[number];

const ROLE_DEFAULTS: Record<string, FeaturePermission[]> = {
  admin: [...FEATURE_PERMISSIONS],
  owner: FEATURE_PERMISSIONS.filter((feature) => feature !== 'platform'),
  manager: ['dashboard', 'pos', 'orders', 'inventory', 'kds', 'expense', 'promotions', 'reservations', 'staff', 'reports', 'ai_assistant', 'branches', 'purchase', 'payments'],
  cashier: ['dashboard', 'pos', 'orders', 'reservations', 'payments'],
  waiter: ['pos'],
  chef: ['kds'],
  staff: ['pos'],
};

export function getEffectivePermissions(role?: string, extraPermissions?: string[] | null): Set<string> {
  const normalizedRole = String(role || '').toLowerCase();
  const defaults = ROLE_DEFAULTS[normalizedRole] || [];
  const merged = new Set<string>(defaults);
  for (const key of extraPermissions || []) {
    if (key) merged.add(String(key));
  }
  return merged;
}

export function hasFeatureAccess(feature: FeaturePermission, role?: string, extraPermissions?: string[] | null): boolean {
  if (feature === 'platform' && String(role || '').toLowerCase() !== 'admin') {
    return false;
  }
  return getEffectivePermissions(role, extraPermissions).has(feature);
}

export function featureForPath(pathname: string): FeaturePermission | null {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/pos')) return 'pos';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/kds')) return 'kds';
  if (pathname.startsWith('/expense')) return 'expense';
  if (pathname.startsWith('/promotions')) return 'promotions';
  if (pathname.startsWith('/reservations')) return 'reservations';
  if (pathname.startsWith('/staff')) return 'staff';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/ai-assistant')) return 'ai_assistant';
  if (pathname.startsWith('/activity-logs')) return 'activity_logs';
  if (pathname.startsWith('/admin-control')) return 'platform';
  if (pathname.startsWith('/branches')) return 'branches';
  if (pathname.startsWith('/purchase')) return 'purchase';
  if (pathname.startsWith('/payments')) return 'payments';
  return null;
}
