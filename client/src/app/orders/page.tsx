'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { printInvoice, type PrintableReceipt } from '@/lib/printInvoice';

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  total: number;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  takenByName?: string | null;
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  items?: OrderItem[];
};

type PaymentMethod = {
  id: string;
  name: string;
  provider?: string;
};

type Receipt = PrintableReceipt;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const OPEN_STATUSES = ['draft', 'confirmed', 'preparing', 'ready', 'served'];

function makeIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLocalDateInputValue(date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function toLocalDateKey(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function roleCanCheckout(role?: string): boolean {
  return ['admin', 'owner', 'manager', 'cashier'].includes((role || '').toLowerCase());
}

export default function OrdersPage() {
  const { user } = useAuth();
  const todayString = getLocalDateInputValue();
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paidReceipt, setPaidReceipt] = useState<Receipt | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [checkoutRequestKey, setCheckoutRequestKey] = useState('');

  const canCheckout = useMemo(() => roleCanCheckout(user?.role), [user?.role]);

  const parseError = async (res: Response, fallback: string) => {
    try {
      const err = await res.json();
      return Array.isArray(err.message) ? err.message.join(', ') : err.message || fallback;
    } catch {
      return fallback;
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/pos/orders`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Failed to fetch orders'));
      }

      const data = await response.json();
      setOrders(data);
      setError('');
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!canCheckout) return;
    try {
      const response = await fetch(`${API_URL}/payments/methods`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      setPaymentMethods(data);
      const cashMethod =
        data.find((method: PaymentMethod) => (method.provider || '').toLowerCase() === 'cash') ||
        data.find((method: PaymentMethod) => method.name.toLowerCase().includes('cash'));

      if (cashMethod?.id) {
        setSelectedPaymentMethod(cashMethod.id);
      } else if (data[0]?.id) {
        setSelectedPaymentMethod((prev) => prev || data[0].id);
      }
    } catch {
      // no-op, orders view can still work
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPaymentMethods();
  }, [canCheckout]);

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchOrders();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
  }, [user?.id]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const getWaiterName = (order: Order) => {
    if (order.takenByName && order.takenByName.trim()) {
      return order.takenByName;
    }
    const name = `${order.createdBy?.firstName || ''} ${order.createdBy?.lastName || ''}`.trim();
    return name || order.createdBy?.email || 'Unknown';
  };

  const handleCheckout = async (orderId: string) => {
    if (!isOnline) {
      setError('Device is offline. Checkout is blocked to prevent payment mismatch.');
      return;
    }

    if (!selectedPaymentMethod) {
      setError('Select payment method first');
      return;
    }

    try {
      setProcessing(true);
      const requestKey = checkoutRequestKey || makeIdempotencyKey(`orders-${orderId}`);
      if (!checkoutRequestKey) {
        setCheckoutRequestKey(requestKey);
      }
      const response = await fetch(`${API_URL}/pos/orders/${orderId}/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          paymentMethodId: selectedPaymentMethod,
          transactionId: transactionId || undefined,
          idempotencyKey: requestKey,
          taxRate: Number(taxRate || 0),
          discountType,
          discountValue: Number(discountValue || 0),
          branchId: user?.branchId || null,
          createdById: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Checkout failed'));
      }

      const data = await response.json();
      setPaidReceipt(data?.receipt || null);
      setTransactionId('');
      setTaxRate('5');
      setDiscountType('none');
      setDiscountValue('');
      setCheckoutRequestKey('');
      setError('');
      await fetchOrders();
    } catch (checkoutError: any) {
      setError(checkoutError.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  const openCheckout = async (orderId: string) => {
    if (!canCheckout) {
      setError('Only cashier, manager, owner, or admin can process payment.');
      return;
    }
    if (!isOnline) {
      setError('Device is offline. Reconnect internet to open checkout.');
      return;
    }
    try {
      setOpeningCheckout(true);
      if (paymentMethods.length === 0) {
        await fetchPaymentMethods();
      }

      const response = await fetch(`${API_URL}/pos/orders/${orderId}`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) {
        throw new Error(await parseError(response, 'Failed to load order details'));
      }
      const order = await response.json();
      setCheckoutOrderId(orderId);
      setCheckoutOrder(order);
      const subtotal = Number(
        (order.items || []).reduce((sum: number, item: OrderItem) => sum + Number(item.total || 0), 0).toFixed(2),
      );
      const orderTaxAmount = Number(order.taxAmount || 0);
      const inferredTaxRate = subtotal > 0 ? Number(((orderTaxAmount / subtotal) * 100).toFixed(2)) : 5;
      const existingDiscount = Number(order.discountAmount || 0);

      setTaxRate(String(Number.isFinite(inferredTaxRate) ? inferredTaxRate : 5));
      if (existingDiscount > 0) {
        setDiscountType('fixed');
        setDiscountValue(existingDiscount.toString());
      } else {
        setDiscountType('none');
        setDiscountValue('');
      }
      setCheckoutRequestKey(makeIdempotencyKey(`orders-${orderId}`));
      setError('');
    } catch (openError: any) {
      setError(openError.message || 'Failed to open checkout');
    } finally {
      setOpeningCheckout(false);
    }
  };

  const closeCheckout = () => {
    setCheckoutOrderId(null);
    setCheckoutOrder(null);
    setPaidReceipt(null);
    setTransactionId('');
    setTaxRate('5');
    setDiscountType('none');
    setDiscountValue('');
    setCheckoutRequestKey('');
  };

  const printReceipt = () => {
    if (!paidReceipt) return;
    printInvoice(paidReceipt);
  };

  const checkoutTotal = useMemo(() => {
    if (!checkoutOrder) return 0;
    return Number(
      (checkoutOrder.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2),
    );
  }, [checkoutOrder]);

  const checkoutDiscount = useMemo(() => {
    const value = Number(discountValue || 0);
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (discountType === 'percent') {
      return Number((checkoutTotal * Math.min(value, 100) / 100).toFixed(2));
    }
    if (discountType === 'fixed') {
      return Math.min(checkoutTotal, Number(value.toFixed(2)));
    }
    return 0;
  }, [checkoutTotal, discountType, discountValue]);

  const checkoutTaxableBase = useMemo(
    () => Math.max(0, Number((checkoutTotal - checkoutDiscount).toFixed(2))),
    [checkoutTotal, checkoutDiscount],
  );

  const checkoutTax = useMemo(() => {
    const rate = Number(taxRate || 0);
    const safeRate = Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : 0;
    return Number((checkoutTaxableBase * safeRate / 100).toFixed(2));
  }, [checkoutTaxableBase, taxRate]);

  const checkoutGrandTotal = useMemo(
    () => Number((checkoutTaxableBase + checkoutTax).toFixed(2)),
    [checkoutTaxableBase, checkoutTax],
  );

  useEffect(() => {
    if (!canCheckout) return;
    if (paymentMethods.length === 0) {
      fetchPaymentMethods();
    }
  }, [canCheckout, paymentMethods.length]);

  const filteredOrders = useMemo(() => {
    if (!selectedDate) return orders;
    return orders.filter((order) => {
      const isOpen = OPEN_STATUSES.includes((order.status || '').toLowerCase());
      // Always keep unpaid/open vouchers visible in Orders screen.
      if (isOpen) return true;
      const referenceDate = order.createdAt;
      const orderDate = toLocalDateKey(referenceDate);
      return orderDate === selectedDate;
    });
  }, [orders, selectedDate]);

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="cm-kicker">Order ledger</span>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Orders</h1>
            <p className="mt-2 text-sm text-slate-600">
              Track transactions, waiter info, and process payment from this screen.
            </p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700">
              <span className="font-semibold">Network:</span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </div>
            <button type="button" onClick={() => setSelectedDate(todayString)} className="cm-btn-secondary">Today</button>
            <button type="button" onClick={fetchOrders} className="cm-btn-secondary">Refresh</button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="cm-panel overflow-x-auto p-4">
          {loading ? (
            <p className="text-slate-600">Loading orders...</p>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {filteredOrders.map((order) => {
                  const isOpen = OPEN_STATUSES.includes((order.status || '').toLowerCase());
                  return (
                    <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{order.orderNumber}</p>
                          <p className="text-xs text-slate-600">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {order.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                        <p><span className="font-semibold">Waiter:</span> {getWaiterName(order)}</p>
                        <p><span className="font-semibold">Items:</span> {order.items?.length || 0}</p>
                        <p className="col-span-2"><span className="font-semibold">Amount:</span> {Number(order.totalAmount).toLocaleString()} MMK</p>
                      </div>
                      <div className="mt-3">
                        {canCheckout && isOpen ? (
                          <button
                            type="button"
                            onClick={() => openCheckout(order.id)}
                            disabled={processing || openingCheckout}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {openingCheckout && checkoutOrderId !== order.id ? 'Opening...' : processing && checkoutOrderId === order.id ? 'Processing...' : 'Checkout'}
                          </button>
                        ) : (
                          <p className="text-xs text-slate-500">No action</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <p className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                    No transactions found for selected date.
                  </p>
                )}
              </div>

              <table className="hidden min-w-full divide-y divide-slate-200 md:table">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Order</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Created</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Waiter</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Items</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOrders.map((order) => {
                    const isOpen = OPEN_STATUSES.includes((order.status || '').toLowerCase());
                    return (
                      <tr key={order.id}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{order.orderNumber}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{new Date(order.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{getWaiterName(order)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{order.items?.length || 0}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{Number(order.totalAmount).toLocaleString()} MMK</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {canCheckout && isOpen ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openCheckout(order.id);
                              }}
                              disabled={processing || openingCheckout}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {openingCheckout && checkoutOrderId !== order.id ? 'Opening...' : processing && checkoutOrderId === order.id ? 'Processing...' : 'Checkout'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                        No transactions found for selected date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        <Modal
          open={Boolean(canCheckout && checkoutOrderId && checkoutOrder)}
          title={checkoutOrder ? `Checkout ${checkoutOrder.orderNumber}` : 'Checkout'}
          onClose={closeCheckout}
        >
          {checkoutOrder && (
            <>
              {paidReceipt ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Payment confirmed for <strong>{paidReceipt.orderNumber}</strong>.
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Receipt: <strong>{paidReceipt.receiptNumber}</strong> · Total:{' '}
                    <strong>{Number(paidReceipt.totalAmount || 0).toLocaleString()} MMK</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={printReceipt}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Print Invoice
                    </button>
                    <button
                      type="button"
                      onClick={closeCheckout}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
              <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(checkoutOrder.items || []).map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-900">{item.productName}</td>
                        <td className="px-3 py-2 text-slate-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-slate-900">{Number(item.total).toLocaleString()} MMK</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-4 grid gap-2 text-sm md:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">Subtotal</span>
                  <div className="font-semibold text-slate-900">{checkoutTotal.toLocaleString()} MMK</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">Discount</span>
                  <div className="font-semibold text-slate-900">- {checkoutDiscount.toLocaleString()} MMK</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">Tax</span>
                  <div className="font-semibold text-slate-900">{checkoutTax.toLocaleString()} MMK</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">Grand Total</span>
                  <div className="font-semibold text-slate-900">{checkoutGrandTotal.toLocaleString()} MMK</div>
                </div>
              </div>

              <div className="mb-3 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tax Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'none' | 'percent' | 'fixed')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    <option value="none">No discount</option>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed amount (MMK)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Discount Value</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    disabled={discountType === 'none'}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 disabled:bg-slate-100"
                    placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 1000'}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Payment Method</label>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>{method.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Transaction ID</label>
                  <input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    placeholder="Optional"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckout(checkoutOrder.id)}
                    disabled={processing || !isOnline}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {processing ? 'Processing...' : 'Confirm Payment'}
                  </button>
                  <button
                    type="button"
                    onClick={closeCheckout}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
                </>
              )}
            </>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
