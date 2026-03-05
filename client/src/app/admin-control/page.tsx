'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

type UserAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  branchId?: string | null;
  shopName?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  subscriptionPlan?: 'free' | 'monthly' | 'yearly';
  subscriptionStatus?: 'active' | 'inactive';
  subscriptionStartAt?: string | null;
  subscriptionEndAt?: string | null;
  deletedAt?: string | null;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  isActive: boolean;
  tableCount?: number;
};

type ActivityLog = {
  id: string;
  createdById?: string | null;
  createdAt: string;
};

type SubscriptionRequest = {
  id: string;
  ownerUserId: string;
  planMonths: number;
  amountMmk: number;
  paymentMethod: string;
  payerShopName?: string;
  payerPhone?: string;
  txLast5: string;
  proofImageDataUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string | null;
  createdAt: string;
  ownerUser?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    shopName?: string | null;
  } | null;
  reviewedBy?: {
    firstName?: string;
    lastName?: string;
  } | null;
};

type BranchView = {
  branchId: string;
  shopName: string;
  address: string;
  township: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerDeletedAt: string | null;
  accounts: number;
  lastActivityAt: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ADMIN_USERS_URL = `${API_URL}/users?includeDeleted=true`;

function buildOwnerSubscriptionDrafts(source: UserAccount[]): Record<string, { plan: 'free' | 'monthly' | 'yearly'; status: 'active' | 'inactive'; endAt: string }> {
  const ownerDrafts: Record<string, { plan: 'free' | 'monthly' | 'yearly'; status: 'active' | 'inactive'; endAt: string }> = {};
  for (const account of Array.isArray(source) ? source : []) {
    if (String(account?.role || '').toLowerCase() !== 'owner') continue;
    ownerDrafts[account.id] = {
      plan: account.subscriptionPlan === 'monthly' || account.subscriptionPlan === 'yearly' ? account.subscriptionPlan : 'free',
      status: account.subscriptionStatus === 'inactive' ? 'inactive' : 'active',
      endAt: account.subscriptionEndAt ? String(account.subscriptionEndAt).slice(0, 10) : '',
    };
  }
  return ownerDrafts;
}

function parseAddress(address?: string | null): { township: string; city: string } {
  const raw = String(address || '').trim();
  if (!raw) return { township: '-', city: '-' };
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      township: parts[parts.length - 2] || '-',
      city: parts[parts.length - 1] || '-',
    };
  }
  return { township: raw, city: '-' };
}

export default function AdminControlPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [ownerStatusFilter, setOwnerStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [subscriptionMode, setSubscriptionMode] = useState<'free' | 'subscription'>('free');
  const [savingMode, setSavingMode] = useState(false);
  const [savingSubscriptionUserId, setSavingSubscriptionUserId] = useState<string | null>(null);
  const [subscriptionDrafts, setSubscriptionDrafts] = useState<
    Record<string, { plan: 'free' | 'monthly' | 'yearly'; status: 'active' | 'inactive'; endAt: string }>
  >({});
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<{ image: string; owner: string } | null>(null);
  const [proofPreviewError, setProofPreviewError] = useState('');

  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const run = async () => {
      try {
        setLoading(true);
        const [usersRes, branchesRes, logsRes, modeRes, requestsRes] = await Promise.all([
          fetch(ADMIN_USERS_URL, { credentials: 'include' }),
          fetch(`${API_URL}/branches`, { credentials: 'include' }),
          fetch(`${API_URL}/activity-logs?limit=500`, { credentials: 'include' }),
          fetch(`${API_URL}/platform-settings/subscription-mode`, { credentials: 'include' }),
          fetch(`${API_URL}/subscription-requests`, { credentials: 'include' }),
        ]);
        if (!usersRes.ok || !branchesRes.ok || !logsRes.ok || !modeRes.ok || !requestsRes.ok) {
          throw new Error('Failed to load platform data');
        }

        const [usersData, branchesData, logsData, modeData, requestsData] = await Promise.all([
          usersRes.json(),
          branchesRes.json(),
          logsRes.json(),
          modeRes.json(),
          requestsRes.json(),
        ]);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setLogs(Array.isArray(logsData) ? logsData : []);
        setSubscriptionMode(String(modeData?.mode || 'free').toLowerCase() === 'subscription' ? 'subscription' : 'free');
        setSubscriptionDrafts(buildOwnerSubscriptionDrafts(Array.isArray(usersData) ? usersData : []));
        setSubscriptionRequests(Array.isArray(requestsData) ? requestsData : []);
        setError('');
      } catch (e: any) {
        setError(e?.message || 'Failed to load platform data');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [isAdmin]);

  const branchRows = useMemo<BranchView[]>(() => {
    const usersByBranch = new Map<string, UserAccount[]>();
    for (const account of users) {
      if (!account.branchId) continue;
      const list = usersByBranch.get(account.branchId) || [];
      list.push(account);
      usersByBranch.set(account.branchId, list);
    }

    const logsByBranchUser = new Map<string, string>();
    const userById = new Map(users.map((item) => [item.id, item]));
    for (const log of logs) {
      if (!log.createdById) continue;
      const actor = userById.get(log.createdById);
      if (!actor?.branchId) continue;
      const existing = logsByBranchUser.get(actor.branchId);
      if (!existing || new Date(log.createdAt).getTime() > new Date(existing).getTime()) {
        logsByBranchUser.set(actor.branchId, log.createdAt);
      }
    }

    const ownerUsers = users.filter((account) => String(account.role).toLowerCase() === 'owner' && account.branchId);
    const ownerByBranch = new Map(ownerUsers.map((owner) => [owner.branchId as string, owner]));

    const rows: BranchView[] = branches.map((branch) => {
      const branchUsers = usersByBranch.get(branch.id) || [];
      const owner = ownerByBranch.get(branch.id);
      const addressSource = owner?.businessAddress || branch.address || null;
      const { township, city } = parseAddress(addressSource);
      return {
        branchId: branch.id,
        shopName: owner?.shopName || branch.name || '-',
        address: addressSource || '-',
        township,
        city,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : 'Owner not assigned',
        ownerEmail: owner?.email || '-',
        ownerPhone: owner?.businessPhone || owner?.phone || branch.phone || '-',
        ownerDeletedAt: owner?.deletedAt || null,
        accounts: branchUsers.length,
        lastActivityAt: logsByBranchUser.get(branch.id) || null,
      };
    });

    // Fallback for owner accounts that reference missing branch rows.
    for (const owner of ownerUsers) {
      const branchId = owner.branchId as string;
      if (rows.some((row) => row.branchId === branchId)) continue;
      const branchUsers = usersByBranch.get(branchId) || [];
      const addressSource = owner.businessAddress || null;
      const { township, city } = parseAddress(addressSource);
      rows.push({
        branchId,
        shopName: owner.shopName || '-',
        address: addressSource || '-',
        township,
        city,
        ownerName: `${owner.firstName} ${owner.lastName}`.trim(),
        ownerEmail: owner.email || '-',
        ownerPhone: owner.businessPhone || owner.phone || '-',
        ownerDeletedAt: owner.deletedAt || null,
        accounts: branchUsers.length,
        lastActivityAt: logsByBranchUser.get(branchId) || null,
      });
    }

    return rows.sort((a, b) => a.shopName.localeCompare(b.shopName));
  }, [branches, logs, users]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const row of branchRows) {
      if (row.city && row.city !== '-') set.add(row.city);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [branchRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return branchRows.filter((row) => {
      if (cityFilter !== 'all' && row.city !== cityFilter) return false;
      if (ownerStatusFilter === 'active' && row.ownerDeletedAt) return false;
      if (ownerStatusFilter === 'deleted' && !row.ownerDeletedAt) return false;
      if (!keyword) return true;
      const haystack = `${row.shopName} ${row.ownerName} ${row.ownerEmail} ${row.township} ${row.city} ${row.address}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [branchRows, cityFilter, ownerStatusFilter, search]);

  const activeUsers = useMemo(
    () => users.filter((account) => account.isActive),
    [users],
  );
  const activeIn24h = useMemo(() => {
    const threshold = Date.now() - 24 * 60 * 60 * 1000;
    const set = new Set<string>();
    for (const log of logs) {
      if (!log.createdById) continue;
      if (new Date(log.createdAt).getTime() >= threshold) {
        set.add(log.createdById);
      }
    }
    return set.size;
  }, [logs]);

  const ownerAccounts = useMemo(
    () =>
      users.filter(
        (account) => String(account.role || '').toLowerCase() === 'owner' && !account.deletedAt,
      ),
    [users],
  );
  const userById = useMemo(() => new Map(users.map((account) => [account.id, account])), [users]);
  const activeSubscriptionRequests = useMemo(
    () =>
      subscriptionRequests.filter((request) => {
        const owner = userById.get(request.ownerUserId);
        return owner ? !owner.deletedAt : false;
      }),
    [subscriptionRequests, userById],
  );
  const deletedSubscriptionRequests = useMemo(
    () =>
      subscriptionRequests.filter((request) => {
        const owner = userById.get(request.ownerUserId);
        return owner ? Boolean(owner.deletedAt) : true;
      }),
    [subscriptionRequests, userById],
  );
  const setMode = async (mode: 'free' | 'subscription') => {
    try {
      setSavingMode(true);
      const response = await fetch(`${API_URL}/platform-settings/subscription-mode`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!response.ok) throw new Error('Failed to update subscription mode');
      setSubscriptionMode(mode);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to update subscription mode');
    } finally {
      setSavingMode(false);
    }
  };

  const saveOwnerSubscription = async (ownerId: string) => {
    const draft = subscriptionDrafts[ownerId];
    if (!draft) return;
    try {
      setSavingSubscriptionUserId(ownerId);
      const response = await fetch(`${API_URL}/users/${ownerId}/subscription`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionPlan: draft.plan,
          subscriptionStatus: draft.status,
          subscriptionEndAt: draft.endAt ? new Date(`${draft.endAt}T23:59:59`).toISOString() : null,
        }),
      });
      if (!response.ok) throw new Error('Failed to update owner subscription');
      await response.json();
      await (async () => {
        const usersRes = await fetch(ADMIN_USERS_URL, { credentials: 'include' });
        if (!usersRes.ok) return;
        const usersData = await usersRes.json();
        const normalizedUsers = Array.isArray(usersData) ? usersData : [];
        setUsers(normalizedUsers);
        setSubscriptionDrafts(buildOwnerSubscriptionDrafts(normalizedUsers));
      })();
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to update owner subscription');
    } finally {
      setSavingSubscriptionUserId(null);
    }
  };

  const reviewSubscriptionRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    try {
      setReviewingRequestId(requestId);
      const response = await fetch(`${API_URL}/subscription-requests/${requestId}/review`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reviewNote: decision === 'approved' ? 'Payment verified' : 'Payment proof not matched',
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Failed to review request');
      }

      const [usersRes, requestsRes] = await Promise.all([
        fetch(ADMIN_USERS_URL, { credentials: 'include' }),
        fetch(`${API_URL}/subscription-requests`, { credentials: 'include' }),
      ]);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const normalizedUsers = Array.isArray(usersData) ? usersData : [];
        setUsers(normalizedUsers);
        setSubscriptionDrafts(buildOwnerSubscriptionDrafts(normalizedUsers));
      }
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setSubscriptionRequests(Array.isArray(requestsData) ? requestsData : []);
      }
      setError('');
    } catch (reviewError: any) {
      setError(reviewError?.message || 'Failed to review request');
    } finally {
      setReviewingRequestId(null);
    }
  };

  return (
    <ProtectedRoute>
      <main className="cm-shell py-8">
        {!isAdmin ? (
          <div className="cm-panel p-6 text-sm text-rose-700">
            Only admin can access platform control.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <span className="cm-kicker">Platform admin</span>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Global Usage Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                View all active shops, owners, locations, and platform usage in one place.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="cm-panel p-5">
                <p className="text-sm text-slate-600">Total Accounts</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{users.length}</p>
              </article>
              <article className="cm-panel p-5">
                <p className="text-sm text-slate-600">Active Accounts</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{activeUsers.length}</p>
              </article>
              <article className="cm-panel p-5">
                <p className="text-sm text-slate-600">Owner Shops</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{branchRows.length}</p>
              </article>
              <article className="cm-panel p-5">
                <p className="text-sm text-slate-600">Users Active (24h)</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{activeIn24h}</p>
              </article>
            </section>

            <section className="cm-panel mt-6 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Subscription Mode</h2>
                  <p className="text-sm text-slate-600">
                    Free mode allows all active users. Subscription mode enforces subscription status for non-admin users.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('free')}
                    disabled={savingMode}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      subscriptionMode === 'free' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    Free Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('subscription')}
                    disabled={savingMode}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      subscriptionMode === 'subscription' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    Subscription Mode
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500">Current mode: {subscriptionMode}</div>
            </section>

            <section className="cm-panel mt-6 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Owner Subscription Control</h2>
                <p className="text-sm text-slate-600">Set monthly/yearly plan and active status per owner.</p>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-700">
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Shop</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Start Date</th>
                      <th className="px-3 py-2">End Date</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerAccounts.map((owner) => {
                      const draft = subscriptionDrafts[owner.id] || {
                        plan: 'free' as const,
                        status: 'active' as const,
                        endAt: '',
                      };
                      return (
                        <tr key={owner.id} className="border-b border-slate-200 text-slate-800">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900">{`${owner.firstName} ${owner.lastName}`.trim()}</div>
                            <div className="text-xs text-slate-600">{owner.email}</div>
                          </td>
                          <td className="px-3 py-2">{owner.shopName || '-'}</td>
                          <td className="px-3 py-2">
                            <select
                              value={draft.plan}
                              onChange={(e) =>
                                setSubscriptionDrafts((prev) => ({
                                  ...prev,
                                  [owner.id]: { ...draft, plan: e.target.value as 'free' | 'monthly' | 'yearly' },
                                }))
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-1"
                            >
                              <option value="free">free</option>
                              <option value="monthly">monthly</option>
                              <option value="yearly">yearly</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={draft.status}
                              onChange={(e) =>
                                setSubscriptionDrafts((prev) => ({
                                  ...prev,
                                  [owner.id]: { ...draft, status: e.target.value as 'active' | 'inactive' },
                                }))
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-1"
                            >
                              <option value="active">active</option>
                              <option value="inactive">inactive</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={owner.subscriptionStartAt ? String(owner.subscriptionStartAt).slice(0, 10) : ''}
                              readOnly
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={draft.endAt}
                              onChange={(e) =>
                                setSubscriptionDrafts((prev) => ({
                                  ...prev,
                                  [owner.id]: { ...draft, endAt: e.target.value },
                                }))
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => saveOwnerSubscription(owner.id)}
                              disabled={savingSubscriptionUserId === owner.id || Boolean(owner.deletedAt)}
                              className="rounded-md border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {savingSubscriptionUserId === owner.id ? 'Saving...' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="cm-panel mt-6 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Subscription Payment Requests</h2>
                <p className="text-sm text-slate-600">Review payment screenshot and approve/reject owner subscription requests.</p>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-700">
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Payment</th>
                      <th className="px-3 py-2">Screenshot</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSubscriptionRequests.map((request) => (
                      <tr key={request.id} className="border-b border-slate-200 text-slate-800">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-900">
                            {`${request.ownerUser?.firstName || ''} ${request.ownerUser?.lastName || ''}`.trim() || 'Deleted user'}
                          </div>
                          <div className="text-xs text-slate-600">{request.ownerUser?.email || request.ownerUserId}</div>
                        </td>
                        <td className="px-3 py-2">{request.planMonths} month(s)</td>
                        <td className="px-3 py-2">{Number(request.amountMmk || 0).toLocaleString()} MMK</td>
                        <td className="px-3 py-2">
                          <div>{request.paymentMethod}</div>
                          <div className="text-xs text-slate-600">Shop: {request.payerShopName || '-'}</div>
                          <div className="text-xs text-slate-600">Phone: {request.payerPhone || '-'}</div>
                          <div className="text-xs text-slate-600">TX last5: {request.txLast5}</div>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              const ownerName = `${request.ownerUser?.firstName || ''} ${request.ownerUser?.lastName || ''}`.trim() || request.ownerUserId;
                              setProofPreview({ image: request.proofImageDataUrl, owner: ownerName });
                              setProofPreviewError('');
                            }}
                            className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View proof
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              request.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : request.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {request.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => reviewSubscriptionRequest(request.id, 'approved')}
                                disabled={reviewingRequestId === request.id}
                                className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => reviewSubscriptionRequest(request.id, 'rejected')}
                                disabled={reviewingRequestId === request.id}
                                className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Reviewed {request.reviewedBy?.firstName || ''} {request.reviewedBy?.lastName || ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {activeSubscriptionRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                          No active user requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="cm-panel mt-6 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Deleted User Payment History</h2>
                <p className="text-sm text-slate-600">
                  Full payment record history from deleted users, including proof screenshots.
                </p>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-700">
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Payment</th>
                      <th className="px-3 py-2">Screenshot</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedSubscriptionRequests.map((request) => {
                      const deletedOwner = userById.get(request.ownerUserId);
                      const ownerName = deletedOwner
                        ? `${deletedOwner.firstName || ''} ${deletedOwner.lastName || ''}`.trim() || 'Deleted user'
                        : 'Deleted user';
                      const ownerEmail = deletedOwner?.email || request.ownerUser?.email || request.ownerUserId;
                      return (
                        <tr key={request.id} className="border-b border-slate-200 text-slate-800">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900">{ownerName}</div>
                            <div className="text-xs text-slate-600">{ownerEmail}</div>
                            <div className="text-xs text-slate-600">Shop: {request.payerShopName || deletedOwner?.shopName || '-'}</div>
                            <div className="text-xs text-slate-600">Phone: {request.payerPhone || deletedOwner?.phone || '-'}</div>
                          </td>
                          <td className="px-3 py-2">{request.planMonths} month(s)</td>
                          <td className="px-3 py-2">{Number(request.amountMmk || 0).toLocaleString()} MMK</td>
                          <td className="px-3 py-2">
                            <div>{request.paymentMethod}</div>
                            <div className="text-xs text-slate-600">TX last5: {request.txLast5}</div>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setProofPreview({ image: request.proofImageDataUrl, owner: ownerName });
                                setProofPreviewError('');
                              }}
                              className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View proof
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                request.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : request.status === 'rejected'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {request.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">{new Date(request.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    {deletedSubscriptionRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                          No deleted user history.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {proofPreview && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
                <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Payment Proof Preview</h3>
                      <p className="text-xs text-slate-600">{proofPreview.owner}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProofPreview(null);
                        setProofPreviewError('');
                      }}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                    {proofPreviewError ? (
                      <div className="p-6 text-sm text-rose-600">{proofPreviewError}</div>
                    ) : (
                      <img
                        src={proofPreview.image}
                        alt="payment proof"
                        className="h-auto w-full rounded-md object-contain"
                        onError={() => setProofPreviewError('Unable to render this screenshot. Please ask user to re-upload proof.')}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            <section className="cm-panel mt-6 p-5">
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Search</label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Shop, owner, township, city..."
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">City</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="all">All cities</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Owner status</label>
                  <select
                    value={ownerStatusFilter}
                    onChange={(e) => setOwnerStatusFilter(e.target.value as 'all' | 'active' | 'deleted')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="all">All users</option>
                    <option value="active">Active user</option>
                    <option value="deleted">Deleted user</option>
                  </select>
                </div>
                <div className="ml-auto text-xs text-slate-500">
                  {loading ? 'Loading...' : `${filteredRows.length} shop(s)`}
                </div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-700">
                      <th className="px-3 py-2">Shop</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Township</th>
                      <th className="px-3 py-2">City</th>
                      <th className="px-3 py-2">Accounts</th>
                      <th className="px-3 py-2">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.branchId} className="border-b border-slate-200 text-slate-800">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-900">{row.shopName}</div>
                          <div className="text-xs text-slate-600">{row.address}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div>{row.ownerName}</div>
                          <div className="text-xs text-slate-600">{row.ownerEmail}</div>
                          {row.ownerDeletedAt && (
                            <span className="mt-1 inline-flex rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              Deleted user
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{row.ownerPhone}</td>
                        <td className="px-3 py-2">{row.township}</td>
                        <td className="px-3 py-2">{row.city}</td>
                        <td className="px-3 py-2">{row.accounts}</td>
                        <td className="px-3 py-2">
                          {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString() : 'No activity'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </ProtectedRoute>
  );
}
