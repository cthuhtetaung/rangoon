'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  branchId: string | null;
  language: string;
  extraPermissions?: string[];
  phone?: string;
  shopName?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  subscriptionPlan?: 'free' | 'monthly' | 'yearly';
  subscriptionStatus?: 'active' | 'inactive';
  subscriptionStartAt?: string | null;
  subscriptionEndAt?: string | null;
}

interface SubscriptionState {
  mode: 'free' | 'subscription';
  blocked: boolean;
  plan: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'inactive';
  subscriptionStartAt: string | null;
  subscriptionEndAt: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  user: User | null;
  loading: boolean;
  subscription: SubscriptionState;
  refreshSubscriptionState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    mode: 'free',
    blocked: false,
    plan: 'free',
    status: 'inactive',
    subscriptionStartAt: null,
    subscriptionEndAt: null,
  });
  const router = useRouter();

  useEffect(() => {
    verifyToken();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      refreshSession();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const checkSubscriptionStatus = async (): Promise<void> => {
    try {
      const response = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/subscription-status`, {
        credentials: 'include',
      });
      if (!response.ok) return;
      const data = await response.json();
      setSubscription({
        mode: String(data?.mode || 'free') === 'subscription' ? 'subscription' : 'free',
        blocked: Boolean(data?.blocked),
        plan: data?.plan === 'monthly' || data?.plan === 'yearly' ? data.plan : 'free',
        status: data?.status === 'active' ? 'active' : 'inactive',
        subscriptionStartAt: data?.subscriptionStartAt || null,
        subscriptionEndAt: data?.subscriptionEndAt || null,
      });
    } catch {
      // swallow network errors
    }
  };

  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const response = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data?.user) {
        setIsAuthenticated(true);
        setUser(data.user);
        await checkSubscriptionStatus();
      }
      return true;
    } catch {
      return false;
    }
  };

  const verifyToken = async () => {
    try {
      const response = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/profile`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setIsAuthenticated(true);
        setUser(userData);
        await checkSubscriptionStatus();
      } else {
        const refreshed = await refreshSession();
        if (refreshed) {
          const retry = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/profile`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          if (retry.ok) {
            const userData = await retry.json();
            setIsAuthenticated(true);
            setUser(userData);
            await checkSubscriptionStatus();
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUser(data.user);
        await checkSubscriptionStatus();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network failure and clear local state
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setSubscription({
        mode: 'free',
        blocked: false,
        plan: 'free',
        status: 'inactive',
        subscriptionStartAt: null,
        subscriptionEndAt: null,
      });
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        user,
        loading,
        subscription,
        refreshSubscriptionState: checkSubscriptionStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
