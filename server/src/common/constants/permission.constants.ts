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
