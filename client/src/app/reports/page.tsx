'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOfflineSyncHistory,
  getPendingQueueCount,
  type OfflineSyncHistoryEntry,
} from '@/lib/offlineOrderQueue';

type PnlSummary = {
  period: 'day' | 'month' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  totalOrders: number;
  totalExpensesCount: number;
  expenseByCategory: Array<{ category: string; amount: number }>;
  salesTransactions: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    tableNumber?: number;
    type: string;
    waiterId?: string;
    waiterName?: string;
    totalAmount: number;
    items: Array<{ name: string; qty: number; total: number }>;
  }>;
  expenseTransactions: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    expenseDate: string;
    description?: string;
  }>;
  waiterSummary: Array<{
    waiterId: string;
    waiterName: string;
    orderCount: number;
    totalSales: number;
    averageOrder: number;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<PnlSummary | null>(null);
  const [syncHistory, setSyncHistory] = useState<OfflineSyncHistoryEntry[]>([]);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const thisMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const thisYear = useMemo(() => String(new Date().getFullYear()), []);

  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('day');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(thisMonth);
  const [year, setYear] = useState(thisYear);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('period', period);

      if (period === 'day') params.set('date', date);
      if (period === 'month') params.set('month', month);
      if (period === 'year') params.set('year', year);
      if (user?.branchId) params.set('branchId', user.branchId);

      const response = await fetch(`${API_URL}/reports/pnl?${params.toString()}`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load P&L report');
      }

      const data = await response.json();
      setSummary(data);
      setError('');
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to load P&L report');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncMeta = async () => {
    const [history, pending] = await Promise.all([
      getOfflineSyncHistory(20),
      getPendingQueueCount(),
    ]);
    setSyncHistory(history);
    setPendingQueueCount(pending);
  };

  useEffect(() => {
    if (!user) return;
    fetchSummary();
    void fetchSyncMeta();
  }, [user?.id, period, date, month, year]);

  const formatMoney = (value: number) => `${Number(value || 0).toLocaleString()} MMK`;

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-6">
          <span className="cm-kicker">Financial Report</span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Profit & Loss</h1>
          <p className="mt-2 text-sm text-slate-600">
            View revenue, expenses, and net profit with day, month, and year filters.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="cm-panel mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Filter Type</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'day' | 'month' | 'year')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>

            {period === 'day' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </div>
            )}

            {period === 'month' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </div>
            )}

            {period === 'year' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  min="2000"
                  max="2100"
                />
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={fetchSummary}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="cm-panel p-6 text-sm text-slate-600">Loading report...</div>
        ) : !summary ? (
          <div className="cm-panel p-6 text-sm text-slate-600">No report data.</div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="cm-panel p-4">
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(summary.totalRevenue)}</p>
              </div>
              <div className="cm-panel p-4">
                <p className="text-sm text-slate-600">Total Expense</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(summary.totalExpense)}</p>
              </div>
              <div className="cm-panel p-4">
                <p className="text-sm text-slate-600">Net Profit (P&L)</p>
                <p className={`mt-2 text-2xl font-semibold ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatMoney(summary.netProfit)}
                </p>
              </div>
              <div className="cm-panel p-4">
                <p className="text-sm text-slate-600">Profit Margin</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.profitMargin}%</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="cm-panel p-4">
                <p className="text-sm text-slate-600">Selected Period</p>
                <p className="mt-2 text-base font-medium text-slate-900">
                  {new Date(summary.startDate).toLocaleString()} - {new Date(summary.endDate).toLocaleString()}
                </p>
              </div>
              <div className="cm-panel p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-600">Orders</p>
                    <p className="text-lg font-semibold text-slate-900">{summary.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Expense Entries</p>
                    <p className="text-lg font-semibold text-slate-900">{summary.totalExpensesCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cm-panel mb-6 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Waiter Sales Summary</h2>
              {summary.waiterSummary.length === 0 ? (
                <p className="text-sm text-slate-600">No waiter sales found in selected period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 text-left text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Waiter</th>
                        <th className="px-3 py-2">Orders</th>
                        <th className="px-3 py-2">Total Sales</th>
                        <th className="px-3 py-2">Avg Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.waiterSummary.map((item) => (
                        <tr key={item.waiterId} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-slate-900">{item.waiterName}</td>
                          <td className="px-3 py-2 text-slate-700">{item.orderCount}</td>
                          <td className="px-3 py-2 font-medium text-slate-900">{formatMoney(item.totalSales)}</td>
                          <td className="px-3 py-2 text-slate-700">{formatMoney(item.averageOrder)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="cm-panel p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Expense Breakdown by Category</h2>
              {summary.expenseByCategory.length === 0 ? (
                <p className="text-sm text-slate-600">No expenses found in selected period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 text-left text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.expenseByCategory.map((item) => (
                        <tr key={item.category} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-slate-900">{item.category}</td>
                          <td className="px-3 py-2 font-medium text-slate-900">{formatMoney(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="cm-panel p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Sales Transactions</h2>
                {summary.salesTransactions.length === 0 ? (
                  <p className="text-sm text-slate-600">No sales transactions in selected period.</p>
                ) : (
                  <div className="max-h-[26rem] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-slate-200 text-left text-slate-700">
                        <tr>
                          <th className="px-3 py-2">Order</th>
                          <th className="px-3 py-2">Items</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.salesTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2 text-slate-900">
                              <div className="font-medium">{tx.orderNumber}</div>
                              <div className="text-xs text-slate-500">
                                {tx.type}{tx.tableNumber ? ` • Table ${tx.tableNumber}` : ''}
                              </div>
                              <div className="text-xs text-slate-500">Waiter: {tx.waiterName || 'Unknown'}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="space-y-1">
                                {tx.items.slice(0, 3).map((item, idx) => (
                                  <div key={`${tx.id}-${idx}`} className="text-xs">
                                    {item.name} x{item.qty}
                                  </div>
                                ))}
                                {tx.items.length > 3 && (
                                  <div className="text-xs text-slate-500">+{tx.items.length - 3} more</div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-900">{formatMoney(tx.totalAmount)}</td>
                            <td className="px-3 py-2 text-slate-700">{new Date(tx.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="cm-panel p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Expense Transactions</h2>
                {summary.expenseTransactions.length === 0 ? (
                  <p className="text-sm text-slate-600">No expense transactions in selected period.</p>
                ) : (
                  <div className="max-h-[26rem] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-slate-200 text-left text-slate-700">
                        <tr>
                          <th className="px-3 py-2">Expense</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.expenseTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2 text-slate-900">
                              <div className="font-medium">{tx.title}</div>
                              {tx.description && <div className="text-xs text-slate-500">{tx.description}</div>}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{tx.category}</td>
                            <td className="px-3 py-2 font-medium text-slate-900">{formatMoney(tx.amount)}</td>
                            <td className="px-3 py-2 text-slate-700">{new Date(tx.expenseDate).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="cm-panel mt-6 p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Device Offline Sync Audit</h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {pendingQueueCount} pending
                  </span>
                  <button
                    type="button"
                    onClick={() => void fetchSyncMeta()}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Refresh Audit
                  </button>
                </div>
              </div>
              <p className="mb-3 text-xs text-slate-500">This section shows sync logs for the current device only.</p>
              {syncHistory.length === 0 ? (
                <p className="text-sm text-slate-600">No local sync history on this device.</p>
              ) : (
                <div className="max-h-[22rem] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 text-left text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Event</th>
                        <th className="px-3 py-2">Table</th>
                        <th className="px-3 py-2">Items</th>
                        <th className="px-3 py-2">Message</th>
                        <th className="px-3 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncHistory.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-semibold uppercase text-slate-900">{entry.event}</td>
                          <td className="px-3 py-2 text-slate-700">T{entry.tableNumber}</td>
                          <td className="px-3 py-2 text-slate-700">{entry.itemCount}</td>
                          <td className="px-3 py-2 text-slate-700">{entry.message}</td>
                          <td className="px-3 py-2 text-slate-600">{new Date(entry.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
