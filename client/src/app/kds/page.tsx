'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface KitchenOrder {
  id: string;
  orderId: string;
  itemName: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  order?: {
    orderNumber?: string;
    tableNumber?: number | null;
    takenByName?: string | null;
    createdBy?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getLocalDateInputValue(date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default function KDSDashboard() {
  const { user } = useAuth();
  const today = getLocalDateInputValue();
  const [pendingOrders, setPendingOrders] = useState<KitchenOrder[]>([]);
  const [preparingOrders, setPreparingOrders] = useState<KitchenOrder[]>([]);
  const [readyOrders, setReadyOrders] = useState<KitchenOrder[]>([]);
  const [servedOrders, setServedOrders] = useState<KitchenOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready' | 'served'>('pending');
  const [servedDate, setServedDate] = useState(today);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('authToken')}` };
      const branchId = user?.branchId || 'unassigned';

      const servedUrl = servedDate
        ? `${API_URL}/kds/served/${branchId}?date=${servedDate}`
        : `${API_URL}/kds/served/${branchId}`;

      const [p, pr, r, s] = await Promise.all([
        fetch(`${API_URL}/kds/pending/${branchId}`, { credentials: 'include', headers }),
        fetch(`${API_URL}/kds/preparing/${branchId}`, { credentials: 'include', headers }),
        fetch(`${API_URL}/kds/ready/${branchId}`, { credentials: 'include', headers }),
        fetch(servedUrl, { credentials: 'include', headers }),
      ]);

      if (!p.ok || !pr.ok || !r.ok || !s.ok) {
        throw new Error('Failed to fetch kitchen orders');
      }

      setPendingOrders(await p.json());
      setPreparingOrders(await pr.json());
      setReadyOrders(await r.json());
      const servedData = await s.json();
      setServedOrders(Array.isArray(servedData) ? servedData : []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch kitchen orders');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.branchId, servedDate]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      void fetchOrders();
    }, 4000);
    return () => clearInterval(timer);
  }, [user?.id, servedDate]);

  useEffect(() => {
    if (!user) return;
    const stream = new EventSource(`${API_URL}/realtime/stream`, { withCredentials: true });
    stream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data || '{}');
        if (!data?.type || data.type === 'heartbeat') return;
        if (data.type.startsWith('order.') || data.type.startsWith('kds.')) {
          void fetchOrders();
        }
      } catch {
        // ignore invalid event
      }
    };
    return () => stream.close();
  }, [user?.id, servedDate]);

  const updateOrderStatus = async (orderId: string, status: KitchenOrder['status']) => {
    try {
      const response = await fetch(`${API_URL}/kds/update-status`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ id: orderId, status, preparedById: user?.id }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to update status');
      }

      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`${API_URL}/kds/cancel/${orderId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to cancel order');
      }

      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    }
  };

  const getWaiterName = (order: KitchenOrder) => {
    const explicit = order.order?.takenByName?.trim();
    if (explicit) return explicit;
    const first = order.order?.createdBy?.firstName || '';
    const last = order.order?.createdBy?.lastName || '';
    const combined = `${first} ${last}`.trim();
    return combined || order.order?.createdBy?.email || 'Unknown';
  };

  const renderOrderCard = (order: KitchenOrder) => (
    <div key={order.id} className="cm-panel mb-4 p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-white">{order.itemName}</h3>
          <p className="text-slate-600 text-sm">
            Order {order.order?.orderNumber || `#${order.orderId.slice(0, 8)}`}
          </p>
          <p className="text-slate-600 text-sm">Table: {order.order?.tableNumber || '-'}</p>
          <p className="text-slate-600 text-sm">Waiter: {getWaiterName(order)}</p>
          <p className="text-slate-600 text-sm">Qty: {order.quantity}</p>
          {order.notes && <p className="text-yellow-400 text-sm mt-1">Notes: {order.notes}</p>}
        </div>
        <span className="px-2 py-1 rounded text-xs font-semibold bg-[#0ea5a226] text-[#9de3d8]">{order.status}</span>
      </div>

      <div className="flex justify-between items-center mt-4">
        <span className="text-slate-600 text-sm">
          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        <div className="flex space-x-2">
          {order.status === 'pending' && (
            <>
              <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="cm-btn-secondary">Start Preparing</button>
              <button onClick={() => cancelOrder(order.id)} className="cm-btn-secondary">Cancel</button>
            </>
          )}

          {order.status === 'preparing' && (
            <button onClick={() => updateOrderStatus(order.id, 'ready')} className="cm-btn-secondary">Mark Ready</button>
          )}

          {order.status === 'ready' && (
            <button onClick={() => updateOrderStatus(order.id, 'served')} className="cm-btn-secondary">Mark Served</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="cm-kicker">Kitchen display system</span>
            <h1 className="mt-3 text-3xl font-semibold text-white">KDS</h1>
            <p className="text-slate-600">Monitor and manage kitchen orders in real-time</p>
          </div>
          <button onClick={fetchOrders} className="cm-btn-secondary">Refresh</button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{error}</div>}

        <div className="cm-panel p-6">
          <div className="flex border-b border-white/10 mb-6">
            <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'pending' ? 'text-white border-b-2 border-[#0ea5a2]' : 'text-slate-600 hover:text-white'}`}>
              Pending ({pendingOrders.length})
            </button>
            <button onClick={() => setActiveTab('preparing')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'preparing' ? 'text-white border-b-2 border-[#0ea5a2]' : 'text-slate-600 hover:text-white'}`}>
              Preparing ({preparingOrders.length})
            </button>
            <button onClick={() => setActiveTab('ready')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'ready' ? 'text-white border-b-2 border-[#0ea5a2]' : 'text-slate-600 hover:text-white'}`}>
              Ready ({readyOrders.length})
            </button>
            <button onClick={() => setActiveTab('served')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'served' ? 'text-white border-b-2 border-[#0ea5a2]' : 'text-slate-600 hover:text-white'}`}>
              Served ({servedOrders.length})
            </button>
          </div>

          {activeTab === 'served' && (
            <div className="mb-4 flex items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Served date</label>
                <input
                  type="date"
                  value={servedDate}
                  onChange={(e) => setServedDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <button onClick={() => setServedDate(today)} className="cm-btn-secondary">Today</button>
              <button onClick={() => setServedDate('')} className="cm-btn-secondary">All</button>
            </div>
          )}

          <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {activeTab === 'pending' && (pendingOrders.length === 0 ? <p className="text-slate-600 text-center py-8">No pending orders</p> : pendingOrders.map(renderOrderCard))}
            {activeTab === 'preparing' && (preparingOrders.length === 0 ? <p className="text-slate-600 text-center py-8">No orders being prepared</p> : preparingOrders.map(renderOrderCard))}
            {activeTab === 'ready' && (readyOrders.length === 0 ? <p className="text-slate-600 text-center py-8">No ready orders</p> : readyOrders.map(renderOrderCard))}
            {activeTab === 'served' &&
              (servedOrders.length === 0 ? (
                <p className="text-slate-600 text-center py-8">
                  {servedDate ? 'No served history for this date' : 'No served history yet'}
                </p>
              ) : (
                servedOrders.map(renderOrderCard)
              ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
