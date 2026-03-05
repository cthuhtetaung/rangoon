'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

type Reservation = {
  id: string;
  reservationNumber: string;
  status: string;
  type: 'table' | 'room';
  reservationDateTime: string;
  tableNumber?: number;
  roomName?: string;
  customerName: string;
  customerPhone: string;
  numberOfGuests: number;
  depositAmount: number;
  specialRequests?: string;
  branchId: string;
};

type Branch = {
  id: string;
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    type: 'table',
    reservationDateTime: '',
    tableNumber: '',
    roomName: '',
    customerName: '',
    customerPhone: '',
    numberOfGuests: '2',
    depositAmount: '',
    specialRequests: '',
    branchId: '',
  });

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [resRes, branchRes] = await Promise.all([
        fetch(`${API_URL}/reservations`, { credentials: 'include', headers: authHeaders() }),
        fetch(`${API_URL}/branches`, { credentials: 'include', headers: authHeaders() }),
      ]);

      if (!resRes.ok) {
        const err = await resRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load reservations');
      }

      const resData = await resRes.json();
      setReservations(resData);

      const branchData = branchRes.ok ? await branchRes.json() : [];
      setBranches(branchData);
      if (!formData.branchId && branchData[0]?.id) {
        setFormData((prev) => ({ ...prev, branchId: branchData[0].id }));
      }
      setError('');
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load reservation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      type: 'table',
      reservationDateTime: '',
      tableNumber: '',
      roomName: '',
      customerName: '',
      customerPhone: '',
      numberOfGuests: '2',
      depositAmount: '',
      specialRequests: '',
      branchId: branches[0]?.id || '',
    });
  };

  const createReservation = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.branchId) {
      setError('No branch found. Please create branch first.');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        type: formData.type,
        reservationDateTime: new Date(formData.reservationDateTime).toISOString(),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        numberOfGuests: Number(formData.numberOfGuests),
        depositAmount: formData.depositAmount ? Number(formData.depositAmount) : 0,
        specialRequests: formData.specialRequests || undefined,
        branchId: formData.branchId,
      };

      if (formData.type === 'table') {
        payload.tableNumber = Number(formData.tableNumber || 0);
      } else {
        payload.roomName = formData.roomName;
      }

      const response = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to create reservation');
      }

      await loadData();
      resetForm();
      setError('');
    } catch (createError: any) {
      setError(createError.message || 'Failed to create reservation');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const value = (status || '').toLowerCase();
    if (value === 'confirmed') return 'bg-emerald-100 text-emerald-700';
    if (value === 'pending') return 'bg-amber-100 text-amber-700';
    if (value === 'cancelled' || value === 'no_show') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };

  const sortedReservations = useMemo(
    () => [...reservations].sort((a, b) => new Date(b.reservationDateTime).getTime() - new Date(a.reservationDateTime).getTime()),
    [reservations],
  );

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="cm-kicker">Booking Desk</span>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Reservations</h1>
            <p className="mt-2 text-sm text-slate-600">Create and track table/room reservations.</p>
          </div>
          <button type="button" onClick={loadData} className="cm-btn-secondary">Refresh</button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="cm-panel mb-6 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create Reservation</h2>
          <form onSubmit={createReservation} className="grid gap-3 md:grid-cols-2">
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            >
              <option value="table">Table</option>
              <option value="room">Room</option>
            </select>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData((prev) => ({ ...prev, branchId: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={formData.reservationDateTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, reservationDateTime: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              required
            />

            {formData.type === 'table' ? (
              <input
                type="number"
                value={formData.tableNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, tableNumber: e.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                placeholder="Table number"
                min="1"
                required
              />
            ) : (
              <input
                value={formData.roomName}
                onChange={(e) => setFormData((prev) => ({ ...prev, roomName: e.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                placeholder="Room name"
                required
              />
            )}

            <input
              value={formData.customerName}
              onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              placeholder="Customer name"
              required
            />
            <input
              value={formData.customerPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              placeholder="Customer phone"
              required
            />
            <input
              type="number"
              value={formData.numberOfGuests}
              onChange={(e) => setFormData((prev) => ({ ...prev, numberOfGuests: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              placeholder="Guests"
              min="1"
              max="100"
            />
            <input
              type="number"
              value={formData.depositAmount}
              onChange={(e) => setFormData((prev) => ({ ...prev, depositAmount: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              placeholder="Deposit amount"
              min="0"
            />
            <input
              value={formData.specialRequests}
              onChange={(e) => setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 md:col-span-2"
              placeholder="Special requests (optional)"
            />
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Create reservation'}
              </button>
            </div>
          </form>
        </div>

        <div className="cm-panel p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Reservation Transactions</h2>
          {loading ? (
            <p className="text-sm text-slate-600">Loading reservations...</p>
          ) : sortedReservations.length === 0 ? (
            <p className="text-sm text-slate-600">No reservations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Reservation</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Booking</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReservations.map((res) => (
                    <tr key={res.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-900">
                        <div className="font-medium">{res.reservationNumber}</div>
                        <div className="text-xs text-slate-500">{new Date(res.reservationDateTime).toLocaleString()}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <div>{res.customerName}</div>
                        <div className="text-xs text-slate-500">{res.customerPhone}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {res.type === 'table' ? `Table ${res.tableNumber || '-'}` : `Room ${res.roomName || '-'}`}
                        <div className="text-xs text-slate-500">Guests: {res.numberOfGuests}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(res.status)}`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-900">{Number(res.depositAmount || 0).toLocaleString()} MMK</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
