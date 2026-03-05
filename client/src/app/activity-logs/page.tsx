'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

type ActivityLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, any> | null;
  createdAt: string;
  createdBy?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function todayValue() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function humanizeAction(action: string): string {
  return String(action || '')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function detailsList(details: Record<string, any> | null): string[] {
  if (!details || typeof details !== 'object') return [];
  const lines: string[] = [];
  const orderNumber = details.orderNumber ? `Order: ${details.orderNumber}` : '';
  const tableNumber = details.tableNumber ? `Table: ${details.tableNumber}` : '';
  if (orderNumber) lines.push(orderNumber);
  if (tableNumber) lines.push(tableNumber);
  if (Array.isArray(details.addedItems) && details.addedItems.length > 0) {
    const names = details.addedItems
      .map((item: any) => `${item?.name || 'Item'} x${item?.qty || item?.quantity || 0}`)
      .join(', ');
    lines.push(`Items: ${names}`);
  }
  if (details.paymentMethodName || details.paymentMethod) {
    lines.push(`Payment: ${details.paymentMethodName || details.paymentMethod}`);
  }
  if (details.amount) {
    lines.push(`Amount: ${Number(details.amount).toLocaleString()} MMK`);
  }
  for (const [key, value] of Object.entries(details)) {
    if (['orderNumber', 'tableNumber', 'addedItems', 'paymentMethodName', 'paymentMethod', 'amount'].includes(key)) {
      continue;
    }
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'object') continue;
    lines.push(`${humanizeAction(key)}: ${String(value)}`);
  }
  return lines.slice(0, 6);
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(todayValue());
  const [dateTo, setDateTo] = useState(todayValue());
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (action) params.set('action', action);
      if (severity) params.set('severity', severity);
      params.set('limit', '500');

      const res = await fetch(`${API_URL}/activity-logs?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to load activity logs');
      }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const timer = setInterval(() => {
      fetchLogs();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => logs, [logs]);

  const displayUser = (log: ActivityLog) => {
    const first = log.createdBy?.firstName || '';
    const last = log.createdBy?.lastName || '';
    const name = `${first} ${last}`.trim();
    return name || log.createdBy?.email || 'System';
  };

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-6">
          <div>
            <span className="cm-kicker">Admin audit</span>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Activity Logs</h1>
            <p className="mt-2 text-sm text-slate-600">Track who changed what and when.</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="cm-panel p-4">
          <div className="mb-4 grid gap-2 md:grid-cols-5">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="cm-input" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="cm-input" />
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="cm-input"
              placeholder="Action contains..."
            />
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="cm-input">
              <option value="">All severity</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <button type="button" className="cm-btn-primary" onClick={fetchLogs}>
              Apply
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading logs...</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">What Happened</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Key Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((log) => {
                    const isRisk = log.severity === 'warning' || log.severity === 'critical';
                    const summaryLines = detailsList(log.details);
                    return (
                      <tr key={log.id} className={isRisk ? 'bg-rose-50/60' : ''}>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{displayUser(log)}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${isRisk ? 'text-rose-700' : 'text-slate-900'}`}>
                          {humanizeAction(log.action)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{log.entityType}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {summaryLines.length === 0 ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <ul className="space-y-1">
                              {summaryLines.map((line, idx) => (
                                <li key={`${log.id}-${idx}`} className="break-words">
                                  {line}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                        No logs for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
