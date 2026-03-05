'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const plans = [
  { months: 1, amount: 15000, label: '1 month' },
  { months: 3, amount: 42000, label: '3 months' },
  { months: 6, amount: 78000, label: '6 months' },
  { months: 12, amount: 144000, label: '1 year' },
];

const paymentMethods = [
  {
    key: 'KPay',
    hint: 'KBZPay transfer',
    phone: '09 693271326',
    accountName: 'Nang Nway Nway Hlaing',
    note: 'Payment',
  },
  {
    key: 'AYAPay',
    hint: 'AYA wallet transfer',
    phone: '09 754 758 505',
    accountName: 'Si Thu Htet Aung',
    note: 'Payment',
  },
  {
    key: 'UABPay',
    hint: 'UABPay transfer',
    phone: '09 754 758 505',
    accountName: 'Si Thu Htet Aung',
    note: 'Payment',
  },
  {
    key: 'WavePay',
    hint: 'Wave money transfer',
    phone: '09 754 758 505',
    accountName: 'Si Thu Htet Aung',
    note: 'Payment',
  },
];

function formatMmk(value: number) {
  return `${value.toLocaleString()} MMK`;
}

async function compressImageToDataUrl(file: File, maxWidth = 1280, quality = 0.78): Promise<string> {
  const imageUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = imageUrl;
  });

  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.max(1, Math.floor(image.width * scale));
  const height = Math.max(1, Math.floor(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

export default function SubscriptionRequiredView() {
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [planMonths, setPlanMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('KPay');
  const [payerShopName, setPayerShopName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [proofImageDataUrl, setProofImageDataUrl] = useState('');
  const [proofFileName, setProofFileName] = useState('');

  const selectedPlan = useMemo(() => plans.find((item) => item.months === planMonths) || plans[0], [planMonths]);
  const selectedMethod = useMemo(
    () => paymentMethods.find((item) => item.key === paymentMethod) || paymentMethods[0],
    [paymentMethod],
  );

  const text = {
    en: {
      title: 'Subscription required. Contact admin',
      subtitle: 'Subscriptions ကုန်ဆုံးသွားပြီဖြစ်ပါသဖြင့် Admin ကို ဆက်သွယ်ရန်',
      subscribeNow: 'Subscribe Now',
      telegram: 'Telegram Contact',
      choosePlan: 'Choose Plan',
      paymentMethod: 'Payment Method',
      payerShopName: 'Shop Name',
      payerShopNameHint: 'Enter your shop name',
      payerPhone: 'Phone Number',
      payerPhoneHint: 'Enter the phone used for transfer',
      uploadProof: 'Upload Payment Screenshot',
      uploadButton: 'Choose Screenshot',
      submit: 'Submit Subscription Request',
      submitting: 'Submitting...',
      pending: 'Your request has been submitted. Admin review is pending.',
      invalidFile: 'Please choose an image file.',
      requiredFields: 'Please fill all fields and upload screenshot.',
      planBadge: 'Bigger plan = better price',
      compressedHint: 'Image is auto-optimized for fast upload.',
      paymentTo: 'Send Payment To',
      phone: 'Phone',
      accountName: 'Account Name',
      transferNote: 'Transfer Note',
    },
    my: {
      title: 'Subscription required. Contact admin',
      subtitle: 'Subscriptions ကုန်ဆုံးသွားပြီဖြစ်ပါသဖြင့် Admin ကို ဆက်သွယ်ရန်',
      subscribeNow: 'Subscribe Now',
      telegram: 'Telegram ဆက်သွယ်ရန်',
      choosePlan: 'Plan ရွေးချယ်ပါ',
      paymentMethod: 'ငွေပေးချေနည်း',
      payerShopName: 'ဆိုင်အမည်',
      payerShopNameHint: 'သင့်ဆိုင်အမည်ထည့်ပါ',
      payerPhone: 'ဖုန်းနံပါတ်',
      payerPhoneHint: 'ငွေလွှဲရာမှာသုံးတဲ့ဖုန်းနံပါတ်ထည့်ပါ',
      uploadProof: 'ငွေပြေစာ Screenshot Upload',
      uploadButton: 'Screenshot ရွေးမည်',
      submit: 'Subscription Request တင်မည်',
      submitting: 'တင်ပို့နေသည်...',
      pending: 'Request တင်ပြီးပါပြီ။ Admin စစ်ဆေးနေပါသည်။',
      invalidFile: 'Image file ရွေးချယ်ပါ။',
      requiredFields: 'အချက်အလက်အားလုံးဖြည့်ပြီး screenshot တင်ပါ။',
      planBadge: 'Plan ကြီးလေ စျေးပိုလျော့လေ',
      compressedHint: 'Upload မြန်အောင် ပုံကို အလိုအလျောက်ချုံ့ထားသည်။',
      paymentTo: 'ငွေလွှဲရန်အချက်အလက်',
      phone: 'ဖုန်းနံပါတ်',
      accountName: 'အကောင့်နာမည်',
      transferNote: 'Note',
    },
  }[language];

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(text.invalidFile);
      return;
    }

    try {
      const compressed = await compressImageToDataUrl(file);
      setProofImageDataUrl(compressed);
      setProofFileName(file.name);
      setError('');
    } catch (imageError: any) {
      setError(imageError?.message || text.invalidFile);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!payerShopName.trim() || !payerPhone.trim() || !proofImageDataUrl) {
      setError(text.requiredFields);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');
      const response = await fetch(`${API_URL}/subscription-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planMonths,
          paymentMethod,
          payerShopName: payerShopName.trim(),
          payerPhone: payerPhone.trim(),
          proofImageDataUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const rawMessage = payload?.message;
        const normalizedMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage || '');
        throw new Error(normalizedMessage || 'Failed to submit subscription request');
      }

      setMessage(text.pending);
      setPayerShopName('');
      setPayerPhone('');
      setProofImageDataUrl('');
      setProofFileName('');
    } catch (submitError: any) {
      const msg = String(submitError?.message || 'Failed to submit subscription request');
      if (msg.toLowerCase().includes('entity too large') || msg.includes('413')) {
        setError('Screenshot file is still too large. Please crop or use a smaller image and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cm-shell py-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{text.title}</h1>
        <p className="mt-2 text-base text-slate-600">{text.subtitle}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex h-11 items-center rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-6 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:brightness-110"
          >
            {text.subscribeNow}
          </button>
          <a
            href="https://t.me/rueonchain"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M9.78 18.65c-.35 0-.29-.13-.41-.47l-1.04-3.42 8.04-5.08" />
              <path d="M9.78 18.65c.27 0 .39-.12.54-.27l1.46-1.42-1.83-1.1" />
              <path d="M9.95 15.86l4.44 3.28c.51.28.88.14 1.01-.48l1.83-8.64c.2-.76-.29-1.1-.78-.88l-10.74 4.14c-.73.29-.72.7-.13.88l2.76.86 6.38-4.03c.3-.18.58-.08.35.12" />
            </svg>
            {text.telegram}
          </a>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">{text.choosePlan}</h2>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">{text.planBadge}</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {plans.map((plan) => (
                <button
                  key={plan.months}
                  type="button"
                  onClick={() => setPlanMonths(plan.months)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    planMonths === plan.months
                      ? 'border-teal-500 bg-teal-50 shadow-sm'
                      : 'border-slate-300 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                  }`}
                >
                  <p className="text-lg font-semibold text-slate-900">{plan.label}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{formatMmk(plan.amount)}</p>
                </button>
              ))}
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-slate-700">{text.paymentMethod}</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => setPaymentMethod(method.key)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      paymentMethod === method.key
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                        : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{method.key}</p>
                    <p className="text-xs text-slate-500">{method.hint}</p>
                  </button>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">{text.paymentTo}</p>
                <div className="mt-2 space-y-1">
                  <p>
                    <span className="font-semibold">{text.phone}:</span> {selectedMethod.phone}
                  </p>
                  <p>
                    <span className="font-semibold">{text.accountName}:</span> {selectedMethod.accountName}
                  </p>
                  <p>
                    <span className="font-semibold">{text.transferNote}:</span> {selectedMethod.note}
                  </p>
                </div>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">{text.payerShopName}</span>
              <input
                value={payerShopName}
                onChange={(event) => setPayerShopName(event.target.value)}
                placeholder={text.payerShopNameHint}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">{text.payerPhone}</span>
              <input
                value={payerPhone}
                onChange={(event) => setPayerPhone(event.target.value)}
                placeholder={text.payerPhoneHint}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">{text.uploadProof}</span>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3">
                <span className="inline-flex h-9 items-center rounded-full border border-slate-300 px-4 text-xs font-semibold text-slate-700">
                  {text.uploadButton}
                </span>
                <span className="ml-3 truncate text-sm text-slate-600">{proofFileName || 'No file selected'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-xs text-slate-500">{text.compressedHint}</p>
              {proofImageDataUrl && (
                <img
                  src={proofImageDataUrl}
                  alt="payment proof"
                  className="mt-2 h-32 w-full rounded-lg border border-slate-200 object-cover"
                />
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {selectedPlan.label} - {formatMmk(selectedPlan.amount)}
            </div>

            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? text.submitting : text.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
