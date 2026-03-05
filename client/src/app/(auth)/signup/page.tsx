'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    shopName: '',
    businessPhone: '',
    businessAddress: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          shopName: formData.shopName,
          businessPhone: formData.businessPhone || formData.phone,
          businessAddress: formData.businessAddress || undefined,
          password: formData.password,
        }),
      });

      if (response.ok) {
        await response.json();
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        const message = Array.isArray(errorData?.message)
          ? errorData.message.join(', ')
          : errorData?.message || 'Failed to create account';
        setError(message);
      }
    } catch (err) {
      setError('An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="cm-panel px-8 py-6 text-sm text-[#bfd7d2]">Preparing registration...</div>
      </div>
    );
  }

  return (
    <div className="cm-shell flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <section className="cm-panel w-full max-w-2xl p-8">
        <div className="mb-6 text-center">
          <span className="cm-kicker">Owner onboarding</span>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Create Owner Account</h1>
          <p className="mt-2 text-sm font-medium text-slate-700">
            This sign-up form is for <strong>Owner</strong> accounts only.
          </p>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">
            အရေးကြီးမှတ်ချက် - ဆိုင်နာမည်ကို အမှန်တကယ်အသုံးပြုတဲ့နာမည်အတိုင်း ဖြည့်ပါ။ ဒီနာမည်ကို Invoice header နဲ့ Print ဘောင်ချာတွေမှာ အတိအကျ အသုံးပြုပါမယ်။
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-2 block text-sm font-semibold text-slate-800">First name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="cm-input"
                placeholder="John"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-2 block text-sm font-semibold text-slate-800">Last name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="cm-input"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="shopName" className="mb-2 block text-sm font-semibold text-slate-800">Shop name</label>
              <input
                id="shopName"
                name="shopName"
                type="text"
                required
                value={formData.shopName}
                onChange={handleChange}
                className="cm-input"
                placeholder="Your official shop name"
              />
            </div>
            <div>
              <label htmlFor="businessPhone" className="mb-2 block text-sm font-semibold text-slate-800">Shop contact phone</label>
              <input
                id="businessPhone"
                name="businessPhone"
                type="tel"
                value={formData.businessPhone}
                onChange={handleChange}
                className="cm-input"
                placeholder="+95 9 ..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="businessAddress" className="mb-2 block text-sm font-semibold text-slate-800">Shop address (optional)</label>
            <input
              id="businessAddress"
              name="businessAddress"
              type="text"
              value={formData.businessAddress}
              onChange={handleChange}
              className="cm-input"
              placeholder="Township / street for invoice footer"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="cm-input"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-slate-800">Owner phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              className="cm-input"
              placeholder="Owner contact number"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="cm-input pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 3l18 18" strokeLinecap="round" />
                    <path d="M10.6 10.6a2 2 0 102.8 2.8" strokeLinecap="round" />
                    <path d="M9.9 4.2A10.9 10.9 0 0112 4c5.2 0 9.3 3.4 10.8 8-0.5 1.5-1.3 2.9-2.3 4.1" strokeLinecap="round" />
                    <path d="M6.2 6.2C4 7.6 2.4 9.7 1.2 12c1.5 4.6 5.6 8 10.8 8 2.3 0 4.4-0.7 6.2-2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1.2 12C2.7 7.4 6.8 4 12 4s9.3 3.4 10.8 8c-1.5 4.6-5.6 8-10.8 8S2.7 16.6 1.2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-800">Confirm password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="cm-input pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-200"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 3l18 18" strokeLinecap="round" />
                    <path d="M10.6 10.6a2 2 0 102.8 2.8" strokeLinecap="round" />
                    <path d="M9.9 4.2A10.9 10.9 0 0112 4c5.2 0 9.3 3.4 10.8 8-0.5 1.5-1.3 2.9-2.3 4.1" strokeLinecap="round" />
                    <path d="M6.2 6.2C4 7.6 2.4 9.7 1.2 12c1.5 4.6 5.6 8 10.8 8 2.3 0 4.4-0.7 6.2-2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1.2 12C2.7 7.4 6.8 4 12 4s9.3 3.4 10.8 8c-1.5 4.6-5.6 8-10.8 8S2.7 16.6 1.2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="cm-btn-primary w-full disabled:opacity-60">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#9eb7b2]">
          Already have access?{' '}
          <a href="/login" className="font-semibold text-[#8dd8ce] hover:text-[#b8fff5]">
            Sign in
          </a>
        </p>
      </section>
    </div>
  );
}
