'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading, user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = {
    en: {
      secure: 'Secure access',
      title: 'Sign in to Rangoon F&B',
      subtitle: 'Use your operator credentials to continue.',
      email: 'Username / Email',
      emailPlaceholder: 'username or email',
      password: 'Password',
      forgot: 'Forgot password?',
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      needAccount: 'Need an account?',
      create: 'Create one',
      disclaimerTitle: 'Disclaimer',
      disclaimerBody:
        'This software is designed for small businesses. If your business has multiple branches and you need professional data operations, using a full ERP system is recommended.',
      consult: 'Get free consultation',
      invalid: 'Invalid email or password',
      loginError: 'An error occurred during login',
    },
    my: {
      secure: 'Secure access',
      title: 'Rangoon F&B သို့ ဝင်ပါ',
      subtitle: 'လုပ်ငန်းအသုံးပြုသူအကောင့်ဖြင့် ဆက်လက်ဝင်ရောက်ပါ။',
      email: 'Username / Email',
      emailPlaceholder: 'username သို့ email',
      password: 'Password',
      forgot: 'Forgot password?',
      signIn: 'ဝင်မည်',
      signingIn: 'ဝင်နေသည်...',
      needAccount: 'အကောင့်မရှိသေးပါလား?',
      create: 'Create one',
      disclaimerTitle: 'သတိပေးချက်',
      disclaimerBody:
        'ဒီ software ကို လုပ်ငန်းသေးများအတွက် ရည်ရွယ်ထားပါတယ်။ သင့်လုပ်ငန်းမှာ ဆိုင်ခွဲများရှိပြီး data ကို professional ဆန်ဆန် စီမံချင်တယ်ဆိုရင် ERP system လိုမျိုးပြည့်စုံတဲ့ solution မျိုးကို အသုံးပြုရန် အကြံပြုပါသည်။',
      consult: 'အခမဲ့ အကြံဉာဏ်ရယူရန်',
      invalid: 'Email သို့ Password မှားနေပါတယ်',
      loginError: 'Login ပြုလုပ်စဉ် အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်',
    },
  }[language];

  useEffect(() => {
    if (isAuthenticated) {
      const role = (user?.role || '').toLowerCase();
      if (role === 'waiter') {
        router.push('/pos');
        return;
      }
      if (role === 'chef') {
        router.push('/kds');
        return;
      }
      router.push('/dashboard');
    }
  }, [isAuthenticated, router, user?.role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(formData.email, formData.password);
      if (!success) {
        setError(t.invalid);
      }
    } catch (err) {
      setError(t.loginError);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="cm-panel px-8 py-6 text-sm text-[#bfd7d2]">Authenticating session...</div>
      </div>
    );
  }

  return (
    <div className="cm-shell flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <section className="cm-panel w-full max-w-md p-8">
        <div className="mb-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              language === 'en' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 text-slate-600'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('my')}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              language === 'my' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 text-slate-600'
            }`}
          >
            မြန်မာ
          </button>
        </div>
        <div className="mb-6 text-center">
          <span className="cm-kicker">{t.secure}</span>
          <h1 className="mt-4 text-3xl font-semibold text-white">{t.title}</h1>
          <p className="mt-2 text-sm text-[#abc1bc]">{t.subtitle}</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#bfd6d2]">{t.email}</label>
            <input
              id="email"
              name="email"
              type="text"
              required
              value={formData.email}
              onChange={handleChange}
              className="cm-input"
              placeholder={t.emailPlaceholder}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-[#bfd6d2]">{t.password}</label>
              <a href="#" className="text-xs text-[#8dd8ce] hover:text-[#b8fff5]">{t.forgot}</a>
            </div>
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

          <button type="submit" disabled={loading} className="cm-btn-primary w-full disabled:opacity-60">
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#9eb7b2]">
          {t.needAccount}{' '}
          <a href="/signup" className="font-semibold text-[#8dd8ce] hover:text-[#b8fff5]">
            {t.create}
          </a>
        </p>

        <div className="mt-6 rounded-xl border border-slate-300/40 bg-slate-50/30 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-800">{t.disclaimerTitle}</p>
          <p className="mt-2 leading-6">{t.disclaimerBody}</p>
          <div className="mt-3 inline-flex items-center gap-2">
            <span className="text-sm text-slate-700">{t.consult}</span>
            <a
              href="https://t.me/rueonchain"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
              aria-label={t.consult}
              title={t.consult}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M9.78 18.87c-.45 0-.37-.17-.52-.6L7.9 13.8l10.46-6.62" />
                <path d="M9.78 18.87c.35 0 .5-.16.7-.35l1.95-1.9-2.44-1.47" />
                <path d="M9.99 15.15l5.9 4.36c.67.37 1.16.18 1.33-.62l2.4-11.3c.25-.98-.37-1.42-1-1.13L4.57 11.95c-.96.39-.95.93-.17 1.17l3.6 1.12L16.3 9.2c.39-.24.74-.1.45.16" />
              </svg>
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
