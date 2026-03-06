'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type GuideStep = {
  title: string;
  details: string[];
};

type GuideContact = {
  title: string;
  details: string;
  phoneLabel: string;
  phone: string;
};

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const t = {
    en: {
      kicker: 'Getting started',
      title: 'Rangoon F&B User Guide',
      subtitle:
        'Follow this flow to run daily operation cleanly: setup products, take orders, track stock, record expenses, and review reports.',
      quickTitle: 'Quick Start (First Day)',
      quick: [
        'Sign in with owner/admin account.',
        'Create products in Inventory and assign proper labels.',
        'Open POS and create sample table orders.',
        'Complete checkout from Orders page.',
        'Record daily expenses in Expense module.',
        'Review Dashboard and Reports at day-end.',
      ],
      localTitle: 'Local Network Use (LAN Only)',
      local: [
        'This software runs in full local mode. Data stays on your main shop computer (local server).',
        'Only devices on the same Wi-Fi can use the system (phone, tablet, POS terminal).',
        'Connect every device to the same router, then open the LAN URL provided by the main computer.',
        'If shop Wi-Fi is down, reconnect all devices to one fallback hotspot and use the same LAN URL again.',
      ],
      sections: [
        {
          title: '1) Setup Your Shop',
          details: [
            'Go to Staff and create accounts for cashier, waiter, and kitchen staff.',
            'Set role permissions carefully so each user sees only relevant modules.',
            'Check branch profile and table count before opening POS.',
          ],
        },
        {
          title: '2) Create Products Correctly',
          details: [
            'Open Inventory and add products with price, stock, and label (food/drink/other).',
            'Use ingredient type for raw materials, and sellable type for menu items.',
            'If menu item consumes raw stock, configure BOM so stock deducts automatically.',
          ],
        },
        {
          title: '3) Daily POS Workflow',
          details: [
            'Waiter opens POS, selects table, and adds products.',
            'For existing table, use "Add more items" to avoid duplicate orders.',
            'Cashier handles payment and checkout from Orders screen.',
          ],
        },
        {
          title: '4) Inventory & Expense Discipline',
          details: [
            'Record stock add/remove/adjust immediately when changes happen.',
            'Every operational cost must be added in Expense (transport, ingredient purchase, utility, etc).',
            'Accurate expense records make profit and loss reports meaningful.',
          ],
        },
        {
          title: '5) End-of-Day Owner Checklist',
          details: [
            'Open Dashboard and verify revenue, paid orders, open tables, and low stock.',
            'Open Activity Logs and confirm who performed key actions.',
            'Open Reports to review sales trend, top products, and P&L before closing day.',
          ],
        },
      ] as GuideStep[],
      tipsTitle: 'Operational Tips',
      tips: [
        'Use consistent product names and labels so POS search is fast.',
        'Do not share owner/admin accounts with staff.',
        'Check low stock list at least twice daily (before rush and before close).',
        'Use AI Assistant for quick questions (today sales, top products, expenses).',
      ],
      ctaPrimary: 'Go to Sign in',
      ctaSecondary: 'Create account',
      support: {
        title: 'Need help?',
        details: 'If setup or connection is not working, contact developer support.',
        phoneLabel: 'Contact Developer',
        phone: '09 952 177 104',
      } as GuideContact,
    },
    my: {
      kicker: 'စတင်အသုံးပြုရန်',
      title: 'Rangoon F&B အသုံးပြုလမ်းညွှန်',
      subtitle:
        'ဒီ workflow ကိုလိုက်နာပြီး နေ့စဉ်လုပ်ငန်းကို သေချာစွာစီမံနိုင်ပါတယ် - product setup, order, stock, expense, report ပြန်စစ်ခြင်း။',
      quickTitle: 'အမြန်စတင် (ပထမနေ့)',
      quick: [
        'Owner/Admin account ဖြင့် အကောင့်ဝင်ပါ။',
        'Inventory ထဲမှာ products ဖန်တီးပြီး label သတ်မှတ်ပါ။',
        'POS ထဲမှာ စားပွဲ order နမူနာထည့်ကြည့်ပါ။',
        'Orders စာမျက်နှာမှ checkout ပြီးစီးအောင်လုပ်ပါ။',
        'နေ့စဉ်အသုံးစရိတ်ကို Expense ထဲမှာ မှတ်တမ်းတင်ပါ။',
        'နေ့ကုန်မှာ Dashboard နဲ့ Reports ပြန်စစ်ပါ။',
      ],
      localTitle: 'Local Network အသုံးပြုနည်း (LAN Only)',
      local: [
        'ဒီ software ကို full local mode ဖြင့်သုံးထားတာဖြစ်ပြီး data များကို ဆိုင်ရဲ့ main computer (local server) မှာပဲ သိမ်းဆည်းထားပါတယ်။',
        'တစ်ခုတည်းသော Wi-Fi / LAN တူတဲ့ device များ (phone/tablet/POS terminal) ပေါ်မှသာ သုံးနိုင်ပါတယ်။',
        'အသုံးပြုမည့် device အားလုံးကို router တစ်ခုတည်းချိတ်ပြီး main computer ပေးတဲ့ LAN link နဲ့ဝင်သုံးပါ။',
        'ဆိုင် Wi-Fi ကျသွားရင် device အားလုံးကို hotspot တစ်ခုတည်းပြန်ချိတ်ပြီး အဲ့ဒီ LAN link နဲ့ပဲ ဆက်သုံးနိုင်ပါတယ်။',
      ],
      sections: [
        {
          title: '1) ဆိုင်စနစ် စတင်သတ်မှတ်ခြင်း',
          details: [
            'Staff မှာ cashier, waiter, kitchen staff account များဖန်တီးပါ။',
            'Role permission များကို သင့်လျော်စွာထားပြီး မလိုအပ်သော module မမြင်ရအောင်လုပ်ပါ။',
            'POS မဖွင့်ခင် branch profile နဲ့ table count ကိုစစ်ဆေးပါ။',
          ],
        },
        {
          title: '2) Product ဖန်တီးရာမှာ မှန်ကန်စွာထားခြင်း',
          details: [
            'Inventory မှာ price, stock, label (အစား/အသောက်/အခြား) နဲ့ product ထည့်ပါ။',
            'Raw material များကို ingredient, menu item များကို sellable အဖြစ် သတ်မှတ်ပါ။',
            'Menu item က ingredient stock ကိုသုံးရင် BOM သတ်မှတ်ပြီး auto stock deduction ဖြစ်အောင်လုပ်ပါ။',
          ],
        },
        {
          title: '3) နေ့စဉ် POS အသုံးပြုနည်း',
          details: [
            'Waiter က POS ထဲမှာ table ရွေးပြီး item ထည့်ပါ။',
            'Table အဟောင်းကို item ထပ်ထည့်မယ်ဆို "Add more items" သုံးပါ။',
            'Cashier က Orders စာမျက်နှာကနေ payment/checkout လုပ်ပါ။',
          ],
        },
        {
          title: '4) Inventory & Expense စည်းကမ်း',
          details: [
            'Stock ပြောင်းလဲမှုဖြစ်တာနဲ့ add/remove/adjust ကို ချက်ချင်းမှတ်ပါ။',
            'လုပ်ငန်းအသုံးစရိတ်အားလုံးကို Expense ထဲမှာ ထည့်သွင်းမှတ်တမ်းတင်ပါ။',
            'Expense မှန်မှန်တင်ထားမှ P&L report တိကျစွာရပါမယ်။',
          ],
        },
        {
          title: '5) Owner အတွက် နေ့ကုန်စစ်ဆေးရန်',
          details: [
            'Dashboard မှာ revenue, paid orders, open tables, low stock စစ်ပါ။',
            'Activity Logs မှာ ဘယ်သူဘာလုပ်သွားတယ်ဆိုတာ verify လုပ်ပါ။',
            'Reports မှာ sales trend, top products, P&L စစ်ပြီးနေ့ပိတ်ပါ။',
          ],
        },
      ] as GuideStep[],
      tipsTitle: 'အသုံးပြုအကြံပြုချက်များ',
      tips: [
        'Product name/label ကိုစနစ်တကျသုံးပါ - POS search လွယ်ကူသွားမယ်။',
        'Owner/Admin account ကို staff များနဲ့ မျှဝေမသုံးပါနှင့်။',
        'Rush hour မတိုင်မီ နှင့် ပိတ်ချိန်မတိုင်မီ low stock ကို မဖြစ်မနေစစ်ပါ။',
        'AI Assistant ကို today sales / top products / expense မေးခွန်းများအတွက်သုံးပါ။',
      ],
      ctaPrimary: 'အကောင့်ဝင်မည်',
      ctaSecondary: 'အကောင့်ဖွင့်မည်',
      support: {
        title: 'အကူအညီလိုပါက',
        details: 'setup မရခြင်း၊ ချိတ်ဆက်မရခြင်း စသည့်ပြဿနာများအတွက် developer ကိုဆက်သွယ်နိုင်သည်။',
        phoneLabel: 'Developer ဆက်သွယ်ရန်',
        phone: '09 952 177 104',
      } as GuideContact,
    },
  }[language];

  return (
    <main className="cm-shell py-10 md:py-14">
      <section className="cm-panel p-7 md:p-9">
        <span className="cm-kicker">{t.kicker}</span>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 md:text-base">{t.subtitle}</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr,1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t.quickTitle}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              {t.quick.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t.tipsTitle}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
              {t.tips.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <article className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
          <h2 className="text-lg font-semibold text-slate-900">{t.localTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {t.local.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {t.sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                {section.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <a href="/login" className="cm-btn-primary">{t.ctaPrimary}</a>
          <a href="/signup" className="cm-btn-secondary">{t.ctaSecondary}</a>
        </div>

        <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">{t.support.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t.support.details}</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {t.support.phoneLabel}: <a className="text-teal-700" href="tel:09952177104">{t.support.phone}</a>
          </p>
        </article>
      </section>
    </main>
  );
}
