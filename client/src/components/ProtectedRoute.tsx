'use client';

import { useAuth } from '../contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { featureForPath, hasFeatureAccess } from '@/lib/accessControl';
import SubscriptionRequiredView from './SubscriptionRequiredView';

function canAccessPath(role: string | undefined, extraPermissions: string[] | undefined, pathname: string): boolean {
  const feature = featureForPath(pathname);
  if (!feature) return true;
  return hasFeatureAccess(feature, role, extraPermissions || []);
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user, subscription } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/login');
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.assign('/login');
          }
        }, 300);
      }
      return;
    }

    if (isAuthenticated && user && !canAccessPath(user.role, user.extraPermissions, pathname)) {
      const fallback = canAccessPath(user.role, user.extraPermissions, '/dashboard') ? '/dashboard' : '/pos';
      router.push(fallback);
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          if (window.location.pathname !== fallback) {
            window.location.assign(fallback);
          }
        }, 300);
      }
    }
  }, [isAuthenticated, loading, pathname, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-700">Session expired. Redirecting to login...</p>
          <a href="/login" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (user && !canAccessPath(user.role, user.extraPermissions, pathname)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-700">You do not have access to this page. Redirecting...</p>
        </div>
      </div>
    );
  }

  if (subscription.mode === 'subscription' && subscription.blocked && String(user?.role || '').toLowerCase() !== 'admin') {
    return <SubscriptionRequiredView />;
  }

  return <>{children}</>;
}
