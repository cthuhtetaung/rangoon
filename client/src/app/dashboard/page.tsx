'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  tableNumber?: number | null;
  createdAt: string;
  takenByName?: string | null;
};

type ActiveTable = {
  tableNumber: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  waiterName?: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
};

type Reservation = {
  id: string;
  reservationNumber: string;
  customerName: string;
  reservationDateTime: string;
  status: string;
  tableNumber?: number | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const PAID_STATUSES = new Set(['paid']);

function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMoney(value: number): string {
  return `${Number(value || 0).toLocaleString()} MMK`;
}

function formatDateLabel(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function calculateDaysLeft(value?: string | null): number | null {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.floor((end - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function DashboardPage() {
  const { user, subscription } = useAuth();
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(formatDateOnly(new Date()));
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTables, setActiveTables] = useState<ActiveTable[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const requestInit: RequestInit = { headers, credentials: 'include' };
        const calls: Promise<Response>[] = [
          fetch(`${API_URL}/pos/orders`, requestInit),
          fetch(`${API_URL}/pos/tables/active`, requestInit),
          fetch(`${API_URL}/products?activeOnly=true`, requestInit),
        ];

        const canSeeReservations = ['admin', 'owner', 'manager', 'cashier'].includes((user?.role || '').toLowerCase());
        if (canSeeReservations) {
          calls.push(fetch(`${API_URL}/reservations`, requestInit));
        }

        const responses = await Promise.all(calls);
        const [ordersRes, tablesRes, productsRes, reservationsRes] = responses;

        if (!ordersRes.ok || !tablesRes.ok || !productsRes.ok) {
          throw new Error('Failed to load dashboard data');
        }

        const ordersData = await ordersRes.json();
        const tablesData = await tablesRes.json();
        const productsData = await productsRes.json();

        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setActiveTables(Array.isArray(tablesData) ? tablesData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);

        if (reservationsRes && reservationsRes.ok) {
          const reservationsData = await reservationsRes.json();
          setReservations(Array.isArray(reservationsData) ? reservationsData : []);
        } else {
          setReservations([]);
        }

        setError('');
      } catch (loadError: any) {
        setError(loadError.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user?.role]);

  const dayOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = formatDateOnly(new Date(order.createdAt));
      return orderDate === selectedDate;
    });
  }, [orders, selectedDate]);

  const paidOrders = useMemo(
    () => dayOrders.filter((order) => PAID_STATUSES.has((order.status || '').toLowerCase())),
    [dayOrders],
  );

  const revenueToday = useMemo(
    () => paidOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    [paidOrders],
  );

  const averageTicket = useMemo(() => {
    if (paidOrders.length === 0) return 0;
    return Number((revenueToday / paidOrders.length).toFixed(2));
  }, [paidOrders.length, revenueToday]);

  const lowStockItems = useMemo(
    () => products.filter((item) => item.stockQuantity > 0 && item.stockQuantity <= 10).sort((a, b) => a.stockQuantity - b.stockQuantity),
    [products],
  );

  const outOfStockItems = useMemo(
    () => products.filter((item) => item.stockQuantity === 0),
    [products],
  );

  const todayReservations = useMemo(
    () =>
      reservations
        .filter((res) => formatDateOnly(new Date(res.reservationDateTime)) === selectedDate)
        .filter((res) => !['cancelled', 'completed', 'no_show'].includes((res.status || '').toLowerCase()))
        .sort((a, b) => new Date(a.reservationDateTime).getTime() - new Date(b.reservationDateTime).getTime()),
    [reservations, selectedDate],
  );

  const t = {
    en: {
      kicker: 'Operations focus',
      title: 'Dashboard',
      subtitle: 'Only critical numbers and pending actions for daily operation.',
      date: 'Date',
      openOrders: 'Open Orders',
      revenue: 'Revenue',
      paidOrders: 'Paid Orders',
      averageTicket: 'Average Ticket',
      openTables: 'Open Tables Now',
      openTableOrders: 'Open Table Orders',
      active: 'active',
      loading: 'Loading...',
      noActiveTables: 'No active tables.',
      criticalAlerts: 'Critical Alerts',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      noLowStock: 'No low stock items.',
      todayReservations: 'Today Reservations',
      noReservations: 'No active reservations.',
      transactions: 'Transactions',
      records: 'records',
      noTransactions: 'No transactions for selected date.',
      time: 'Time',
      order: 'Order',
      table: 'Table',
      waiter: 'Waiter',
      status: 'Status',
      amount: 'Amount',
      reviewOrders: 'Review Orders',
      checkInventory: 'Check Inventory',
      openReports: 'Open Reports',
      unknown: 'Unknown',
      subscription: 'Subscription',
      activeFrom: 'Active from',
      expireOn: 'Expire on',
      warning2Days: 'Subscription will expire in 2 days. Please renew now.',
      developerContact: 'Contact Developer',
      developerPhone: 'Phone',
      callNow: 'Call now',
    },
    my: {
      kicker: 'လုပ်ငန်းအခြေအနေ',
      title: 'ဒက်ရှ်ဘုတ်',
      subtitle: 'နေ့စဉ်လုပ်ငန်းအတွက် အရေးကြီးတဲ့နံပါတ်တွေကို ပြထားပါတယ်။',
      date: 'ရက်စွဲ',
      openOrders: 'အော်ဒါများ',
      revenue: 'ရောင်းအား',
      paidOrders: 'ငွေချေပြီး',
      averageTicket: 'ပျမ်းမျှဘေလ်',
      openTables: 'လက်ရှိတင်စားနေသည့် စားပွဲများ',
      openTableOrders: 'ဖွင့်ထားသော စားပွဲအော်ဒါများ',
      active: 'လုပ်ဆောင်နေ',
      loading: 'တင်နေသည်...',
      noActiveTables: 'ဖွင့်ထားတဲ့ စားပွဲမရှိပါ။',
      criticalAlerts: 'အရေးကြီးသတိပေးချက်',
      lowStock: 'စတော့နည်း',
      outOfStock: 'စတော့ကုန်',
      noLowStock: 'စတော့နည်း ပစ္စည်းမရှိပါ။',
      todayReservations: 'ယနေ့ဘိုကင်များ',
      noReservations: 'ယနေ့ဘိုကင်မရှိပါ။',
      transactions: 'ငွေစာရင်း',
      records: 'မှတ်တမ်း',
      noTransactions: 'ရွေးထားသော ရက်စွဲအတွက် စာရင်းမရှိပါ။',
      time: 'အချိန်',
      order: 'အော်ဒါ',
      table: 'စားပွဲ',
      waiter: 'ဝန်ထမ်း',
      status: 'အခြေအနေ',
      amount: 'ပမာဏ',
      reviewOrders: 'အော်ဒါစစ်မည်',
      checkInventory: 'စတော့ကြည့်မည်',
      openReports: 'အစီရင်ခံစာ',
      unknown: 'မသိ',
      subscription: 'Subscription',
      activeFrom: 'စတင်သုံးခွင့်ရက်',
      expireOn: 'သက်တမ်းကုန်ရက်',
      warning2Days: 'Subscription သက်တမ်းကုန်ရန် ၂ ရက်သာလိုပါတော့သည်။ အမြန်သက်တမ်းတိုးပါ။',
      developerContact: 'Developer နှင့်ဆက်သွယ်ရန်',
      developerPhone: 'ဖုန်း',
      callNow: 'ယခုခေါ်ရန်',
    },
  }[language];

  const isOwner = String(user?.role || '').toLowerCase() === 'owner';
  const showSubscriptionCard = isOwner && subscription.mode === 'subscription' && !subscription.blocked;
  const subscriptionStart = subscription.subscriptionStartAt || user?.subscriptionStartAt || null;
  const subscriptionEnd = subscription.subscriptionEndAt || user?.subscriptionEndAt || null;
  const daysLeft = calculateDaysLeft(subscriptionEnd);
  const showExpiryWarning =
    showSubscriptionCard && subscription.status === 'active' && typeof daysLeft === 'number' && daysLeft <= 2 && daysLeft >= 0;

  return (
    <ProtectedRoute>
      <main className={`cm-shell py-8 md:py-10 ${isOwner ? 'pb-28 md:pb-10' : ''}`}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="cm-kicker">{t.kicker}</span>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 md:text-4xl">{t.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {showSubscriptionCard && (
              <div className="w-[220px] rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <p className="font-semibold">{t.subscription}</p>
                <p>{t.activeFrom}: {formatDateLabel(subscriptionStart)}</p>
                <p>{t.expireOn}: {formatDateLabel(subscriptionEnd)}</p>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{t.date}</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <Link href="/orders" className="cm-btn-primary">{t.openOrders}</Link>
            </div>
          </div>
        </div>

        {showExpiryWarning && (
          <div className="cm-slide-alert mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {t.warning2Days}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="cm-panel p-5">
            <p className="text-sm font-medium text-slate-600">{t.revenue} ({selectedDate})</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-slate-900">{formatMoney(revenueToday)}</p>
          </article>
          <article className="cm-panel p-5">
            <p className="text-sm font-medium text-slate-600">{t.paidOrders}</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-slate-900">{paidOrders.length}</p>
          </article>
          <article className="cm-panel p-5">
            <p className="text-sm font-medium text-slate-600">{t.averageTicket}</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-slate-900">{formatMoney(averageTicket)}</p>
          </article>
          <article className="cm-panel p-5">
            <p className="text-sm font-medium text-slate-600">{t.openTables}</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-slate-900">{activeTables.length}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <article className="cm-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{t.openTableOrders}</h2>
              <span className="text-xs font-semibold text-slate-500">{activeTables.length} {t.active}</span>
            </div>
            {loading ? (
              <p className="text-sm text-slate-600">{t.loading}</p>
            ) : activeTables.length === 0 ? (
              <p className="text-sm text-slate-600">{t.noActiveTables}</p>
            ) : (
              <div className="space-y-2">
                {activeTables.slice(0, 8).map((table) => (
                  <div key={`${table.tableNumber}-${table.orderNumber}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Table {table.tableNumber} · {table.orderNumber}</p>
                      <p className="text-xs text-slate-600">
                        {table.itemCount} items · {table.waiterName || 'Unknown waiter'} · {table.status}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(table.totalAmount)}</p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="cm-panel p-6">
            <h2 className="text-xl font-semibold text-slate-900">{t.criticalAlerts}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {t.lowStock} ({lowStockItems.length}) · {t.outOfStock} ({outOfStockItems.length})
                </p>
                <div className="mt-2 space-y-1">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <p key={item.id} className="text-sm text-slate-700">{item.name} ({item.sku}) · {item.stockQuantity} left</p>
                  ))}
                  {lowStockItems.length === 0 && <p className="text-sm text-slate-600">{t.noLowStock}</p>}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <p className="text-sm font-semibold text-slate-800">{t.todayReservations} ({todayReservations.length})</p>
                <div className="mt-2 space-y-1">
                  {todayReservations.slice(0, 5).map((reservation) => (
                    <p key={reservation.id} className="text-sm text-slate-700">
                      {new Date(reservation.reservationDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {reservation.customerName}
                      {reservation.tableNumber ? ` · Table ${reservation.tableNumber}` : ''}
                    </p>
                  ))}
                  {todayReservations.length === 0 && <p className="text-sm text-slate-600">{t.noReservations}</p>}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 cm-panel p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t.transactions} ({selectedDate})</h2>
            <span className="text-xs font-semibold text-slate-500">{dayOrders.length} {t.records}</span>
          </div>
          {dayOrders.length === 0 ? (
            <p className="text-sm text-slate-600">{t.noTransactions}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.time}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.order}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.table}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.waiter}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.status}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">{t.amount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayOrders.slice(0, 12).map((order) => (
                    <tr key={order.id}>
                      <td className="px-3 py-2 text-sm text-slate-700">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">{order.orderNumber}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{order.tableNumber || '-'}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{order.takenByName || t.unknown}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{order.status}</td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                        {formatMoney(order.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/orders" className="cm-btn-secondary">{t.reviewOrders}</Link>
          <Link href="/inventory" className="cm-btn-secondary">{t.checkInventory}</Link>
          <Link href="/reports" className="cm-btn-secondary">{t.openReports}</Link>
        </div>

      </main>
      {isOwner && (
        <aside className="fixed bottom-4 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-[280px] rounded-2xl border border-teal-200 bg-gradient-to-br from-white to-teal-50 p-4 shadow-xl backdrop-blur sm:bottom-6 sm:right-6 sm:w-[280px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{t.developerContact}</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{t.developerPhone}: 09 952 177 104</p>
          <a
            href="tel:09952177104"
            className="mt-3 inline-flex items-center rounded-lg border border-teal-300 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {t.callNow}
          </a>
        </aside>
      )}
    </ProtectedRoute>
  );
}
