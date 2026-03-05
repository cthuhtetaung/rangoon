'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { printInvoice, type PrintableReceipt } from '@/lib/printInvoice';
import {
  enqueueSaveTableOrder,
  flushOfflineQueue,
  getOfflineSyncHistory,
  getPendingQueueCount,
  type OfflineSyncHistoryEntry,
} from '@/lib/offlineOrderQueue';

type Product = {
  id: string;
  name: string;
  sku?: string;
  price: number;
  stockQuantity: number;
  menuLabel?: string | null;
};

type BranchConfig = {
  id: string;
  isHeadquarters?: boolean;
  tableCount?: number;
};

type CartItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
};

type Receipt = PrintableReceipt;

type OpenOrder = {
  id: string;
  orderNumber: string;
  tableNumber: number;
  status: string;
  updatedAt: string;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }>;
};

type ActiveTable = {
  tableNumber: number;
  orderId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  waiterId?: string;
  waiterName?: string;
  updatedAt: string;
};

type ReadyNotification = {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber: number | null;
  itemName: string;
  quantity: number;
  status: 'ready';
  readyAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const POS_DRAFT_PREFIX = 'odex_pos_draft_v1';

function roleCanTakeOrders(role?: string): boolean {
  return ['admin', 'owner', 'manager', 'cashier', 'waiter', 'staff'].includes((role || '').toLowerCase());
}

export default function POSPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTables, setActiveTables] = useState<ActiveTable[]>([]);
  const [tableCount, setTableCount] = useState(12);
  const [tableCountInput, setTableCountInput] = useState('12');
  const [tableConfigBranchId, setTableConfigBranchId] = useState<string | null>(null);
  const [savingTableCount, setSavingTableCount] = useState(false);
  const [readyNotifications, setReadyNotifications] = useState<ReadyNotification[]>([]);
  const [ackLoadingId, setAckLoadingId] = useState<string | null>(null);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [offlineSyncHistory, setOfflineSyncHistory] = useState<OfflineSyncHistoryEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncingOfflineQueue, setSyncingOfflineQueue] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productLabelFilter, setProductLabelFilter] = useState<'all' | 'food' | 'drink' | 'other'>('all');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [baselineCart, setBaselineCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [editingExistingOrder, setEditingExistingOrder] = useState(false);
  const cartRef = useRef<CartItem[]>([]);
  const baselineCartRef = useRef<CartItem[]>([]);
  const openOrderIdRef = useRef<string | null>(null);
  const editingExistingOrderRef = useRef(false);

  const canTakeOrders = roleCanTakeOrders(user?.role);
  const canConfigureTables = ['admin', 'owner'].includes((user?.role || '').toLowerCase());
  const tableNumbers = useMemo(
    () => Array.from({ length: Math.max(1, Math.min(200, tableCount)) }, (_, index) => index + 1),
    [tableCount],
  );
  const activeTableMap = useMemo(
    () => new Map(activeTables.map((table) => [table.tableNumber, table])),
    [activeTables],
  );
  const selectedTableInfo = activeTableMap.get(tableNumber);
  const tableReadyNotifications = useMemo(
    () => readyNotifications.filter((item) => item.tableNumber === tableNumber),
    [readyNotifications, tableNumber],
  );
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const label = String(product.menuLabel || '').trim().toLowerCase();
      if (productLabelFilter !== 'all' && label !== productLabelFilter) {
        return false;
      }
      if (!query) return true;
      const aliases =
        label === 'food'
          ? 'food အစား စားစရာ'
          : label === 'drink'
            ? 'drink beverage အသောက် သောက်စရာ'
            : label === 'other'
              ? 'other others အခြား'
              : '';
      const haystack = [product.name, product.sku || '', label, aliases]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [productLabelFilter, productSearch, products]);

  const parseErrorMessage = async (response: Response, fallback: string) => {
    try {
      const err = await response.json();
      return Array.isArray(err.message) ? err.message.join(', ') : err.message || fallback;
    } catch {
      return fallback;
    }
  };

  const getDraftKey = (nextTableNumber: number): string => {
    return `${POS_DRAFT_PREFIX}:${user?.id || 'anon'}:table:${nextTableNumber}`;
  };

  const restoreDraftForTable = (nextTableNumber: number): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(getDraftKey(nextTableNumber));
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!Array.isArray(draft?.cart) || !Array.isArray(draft?.baselineCart)) return false;
      cartRef.current = draft.cart;
      baselineCartRef.current = draft.baselineCart;
      openOrderIdRef.current = draft.openOrderId || null;
      setCart(draft.cart);
      setBaselineCart(draft.baselineCart);
      setOpenOrderId(draft.openOrderId || null);
      return true;
    } catch {
      return false;
    }
  };

  const clearDraftForTable = (nextTableNumber: number): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getDraftKey(nextTableNumber));
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getJsonHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  });

  const refreshOfflineCount = async () => {
    const [pending, history] = await Promise.all([
      getPendingQueueCount(),
      getOfflineSyncHistory(6),
    ]);
    setOfflinePendingCount(pending);
    setOfflineSyncHistory(history);
  };

  const syncOfflineQueueNow = async () => {
    if (!user) return;
    const token = localStorage.getItem('authToken') || undefined;
    if (!navigator.onLine) {
      setError('Device is offline. Pending orders will sync when internet is back.');
      return;
    }

    try {
      setSyncingOfflineQueue(true);
      const result = await flushOfflineQueue(API_URL, token);
      setOfflinePendingCount(result.pending);
      setOfflineSyncHistory(await getOfflineSyncHistory(6));
      if (result.synced > 0) {
        await fetchInitialData();
        await loadOpenOrderForTable(tableNumber, { force: true });
      }
      setError(result.synced > 0 ? `Synced ${result.synced} pending order(s).` : '');
    } catch {
      setError('Failed to sync pending queue');
    } finally {
      setSyncingOfflineQueue(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [productRes, tableRes] = await Promise.all([
        fetch(`${API_URL}/products?forPos=true`, {
          credentials: 'include',
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/pos/tables/active`, {
          credentials: 'include',
          headers: getAuthHeaders(),
        }),
      ]);

      if (!productRes.ok || !tableRes.ok) {
        throw new Error('Failed to load POS data');
      }

      const [productData, tableData] = await Promise.all([productRes.json(), tableRes.json()]);
      setProducts(productData);
      setActiveTables(tableData);
      setError('');
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to load POS data');
    } finally {
      setLoading(false);
    }
  };

  const loadTableConfig = async () => {
    try {
      const headers = getAuthHeaders();

      let branch: BranchConfig | null = null;
      if (user?.branchId) {
        const res = await fetch(`${API_URL}/branches/${user.branchId}`, { credentials: 'include', headers });
        if (res.ok) {
          branch = await res.json();
        }
      }

      if (!branch) {
        const listRes = await fetch(`${API_URL}/branches`, { credentials: 'include', headers });
        if (listRes.ok) {
          const branches: BranchConfig[] = await listRes.json();
          branch = branches.find((item) => item.isHeadquarters) || branches[0] || null;
        }
      }

      if (!branch) return;
      setTableConfigBranchId(branch.id);
      const nextCount = Number(branch.tableCount || 12);
      const safeCount = Number.isFinite(nextCount) ? Math.max(1, Math.min(200, nextCount)) : 12;
      setTableCount(safeCount);
      setTableCountInput(String(safeCount));
      if (tableNumber > safeCount) {
        setTableNumber(1);
      }
    } catch {
      // keep fallback 12
    }
  };

  const hasUnsavedDraftChanges = (): boolean => {
    const currentCart = cartRef.current;
    const currentBaseline = baselineCartRef.current;
    const currentOpenOrderId = openOrderIdRef.current;
    if (!currentOpenOrderId && currentCart.length > 0) return true;
    if (currentCart.length !== currentBaseline.length) return true;
    const baselineMap = new Map(currentBaseline.map((item) => [item.productId, item.quantity]));
    return currentCart.some((item) => (baselineMap.get(item.productId) || 0) !== item.quantity);
  };

  const loadOpenOrderForTable = async (nextTableNumber: number, options?: { force?: boolean }) => {
    try {
      setTableLoading(true);
      const response = await fetch(`${API_URL}/pos/orders/open?tableNumber=${nextTableNumber}`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Failed to load table order'));
      }

      const orders: OpenOrder[] = await response.json();
      const order = orders[0];
      if (!options?.force && editingExistingOrderRef.current) {
        return;
      }
      if (!order) {
        if (!options?.force && hasUnsavedDraftChanges()) {
          return;
        }
        cartRef.current = [];
        baselineCartRef.current = [];
        openOrderIdRef.current = null;
        setCart([]);
        setBaselineCart([]);
        setOpenOrderId(null);
        setEditingExistingOrder(true);
        return;
      }

      if (!options?.force && hasUnsavedDraftChanges()) {
        return;
      }

      setOpenOrderId(order.id);
      cartRef.current = [];
      baselineCartRef.current = [];
      openOrderIdRef.current = order.id;
      setCart([]);
      setBaselineCart([]);
      setEditingExistingOrder(false);
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load table order');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    cartRef.current = cart;
    baselineCartRef.current = baselineCart;
    openOrderIdRef.current = openOrderId;
    editingExistingOrderRef.current = editingExistingOrder;
  }, [cart, baselineCart, openOrderId, editingExistingOrder]);

  useEffect(() => {
    if (!user) return;
    fetchInitialData();
    void loadTableConfig();
    void refreshOfflineCount();
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(
        getDraftKey(tableNumber),
        JSON.stringify({
          cart,
          baselineCart,
          openOrderId,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // ignore localStorage errors
    }
  }, [user?.id, tableNumber, cart, baselineCart, openOrderId]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('authToken') || undefined;
    setIsOnline(navigator.onLine);

    const syncQueue = async () => {
      if (!navigator.onLine) return;
      const result = await flushOfflineQueue(API_URL, token);
      setOfflinePendingCount(result.pending);
      setOfflineSyncHistory(await getOfflineSyncHistory(6));
      if (result.synced > 0) {
        await fetchInitialData();
        await loadOpenOrderForTable(tableNumber, { force: true });
      }
    };

    void syncQueue();
    const timer = setInterval(() => {
      void syncQueue();
    }, 8000);
    const handleOnline = () => {
      setIsOnline(true);
      void syncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.id, tableNumber]);

  const fetchReadyNotifications = async () => {
    try {
      const branchId = user?.branchId || 'unassigned';
      const response = await fetch(`${API_URL}/kds/ready-notifications/${branchId}`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      setReadyNotifications(Array.isArray(data) ? data : []);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    if (!user) return;
    const restored = restoreDraftForTable(tableNumber);
    if (!restored) {
      loadOpenOrderForTable(tableNumber, { force: true });
    }
  }, [tableNumber, user?.id]);

  useEffect(() => {
    if (!user || !canTakeOrders) return;
    fetchReadyNotifications();
    const timer = setInterval(fetchReadyNotifications, 7000);
    return () => clearInterval(timer);
  }, [user?.id, user?.branchId, canTakeOrders]);

  useEffect(() => {
    if (!user) return;
    const stream = new EventSource(`${API_URL}/realtime/stream`, { withCredentials: true });
    stream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data || '{}');
        if (!data?.type || data.type === 'heartbeat') return;
        if (data.type.startsWith('order.') || data.type.startsWith('kds.')) {
          void fetchInitialData();
          void loadOpenOrderForTable(tableNumber);
          void fetchReadyNotifications();
        }
      } catch {
        // ignore invalid stream payload
      }
    };
    return () => stream.close();
  }, [user?.id, tableNumber]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      void fetchInitialData();
      void loadOpenOrderForTable(tableNumber);
    }, 5000);
    return () => clearInterval(timer);
  }, [user?.id, tableNumber]);

  const addToCart = (product: Product) => {
    if (openOrderId && !editingExistingOrder) {
      setError('Tap "Add more items" on current order before adding new items.');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: Number(product.price),
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart],
  );
  const tax = Number((subtotal * 0.05).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  const saveTableOrder = async () => {
    if (!canTakeOrders) {
      setError('Your role cannot create orders');
      return;
    }

    if (cart.length === 0) {
      setError('Add items to cart first');
      return;
    }

    const baselineQtyMap = new Map(
      baselineCart.map((item) => [item.productId, Number(item.quantity) || 0]),
    );

    const itemsToSave =
      openOrderId
        ? cart
            .map((item) => {
              const baselineQty = baselineQtyMap.get(item.productId) || 0;
              const addQty = item.quantity - baselineQty;
              if (addQty <= 0) return null;
              return {
                productId: item.productId,
                productName: item.productName,
                price: item.price,
                quantity: addQty,
              };
            })
            .filter(
              (item): item is { productId: string; productName: string; price: number; quantity: number } =>
                Boolean(item),
            )
        : cart.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
          }));

    if (openOrderId && itemsToSave.length === 0) {
      setError('No new items to add for this table');
      return;
    }

    try {
      setSaveLoading(true);
      const payload = {
        tableNumber,
        type: 'dine_in',
        branchId: user?.branchId || null,
        createdById: user?.id,
        items: itemsToSave,
      };
      const response = await fetch(`${API_URL}/pos/orders/save`, {
        method: 'POST',
        credentials: 'include',
        headers: getJsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Failed to save table order'));
      }

      const data = await response.json();
      const nextOrderId = data?.id || openOrderId || null;
      setOpenOrderId(nextOrderId);
      openOrderIdRef.current = nextOrderId;
      cartRef.current = [];
      baselineCartRef.current = [];
      setCart([]);
      setBaselineCart([]);
      setEditingExistingOrder(false);
      clearDraftForTable(tableNumber);
      setError('');
      await fetchInitialData();
      await loadOpenOrderForTable(tableNumber, { force: true });
    } catch (saveError: any) {
      const message = saveError?.message || '';
      const shouldQueueOffline = !navigator.onLine || message.toLowerCase().includes('failed to fetch');
      if (shouldQueueOffline) {
        await enqueueSaveTableOrder({
          tableNumber,
          type: 'dine_in',
          branchId: user?.branchId || null,
          createdById: user?.id,
          items: itemsToSave,
        });
        setBaselineCart(cart);
        await refreshOfflineCount();
        setError('No internet. Order saved on this device and will sync automatically.');
      } else {
        setError(saveError.message || 'Failed to save table order');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const printReceipt = () => {
    if (!receipt) return;
    printInvoice(receipt);
  };

  const handleSelectTable = (nextTableNumber: number) => {
    const safeTableNumber = Math.max(1, Math.min(tableCount, nextTableNumber));
    cartRef.current = [];
    baselineCartRef.current = [];
    openOrderIdRef.current = null;
    setCart([]);
    setBaselineCart([]);
    setOpenOrderId(null);
    setEditingExistingOrder(true);
    setTableNumber(safeTableNumber);
    setReceipt(null);
    setError('');
    void loadOpenOrderForTable(safeTableNumber, { force: true });
  };

  const handleSaveTableCount = async () => {
    if (!canConfigureTables || !tableConfigBranchId) return;
    const numeric = Number(tableCountInput);
    if (!Number.isFinite(numeric) || numeric < 1 || numeric > 200) {
      setError('Table count must be between 1 and 200');
      return;
    }

    try {
      setSavingTableCount(true);
      const response = await fetch(`${API_URL}/branches/${tableConfigBranchId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: getJsonHeaders(),
        body: JSON.stringify({ tableCount: Math.floor(numeric) }),
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Failed to save table count'));
      }

      const saved = await response.json();
      const safeCount = Math.max(1, Math.min(200, Number(saved?.tableCount || numeric)));
      setTableCount(safeCount);
      setTableCountInput(String(safeCount));
      if (tableNumber > safeCount) {
        setTableNumber(1);
      }
      setError('');
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save table count');
    } finally {
      setSavingTableCount(false);
    }
  };

  const markNotificationServed = async (notificationId: string) => {
    try {
      setAckLoadingId(notificationId);
      const response = await fetch(`${API_URL}/kds/served/${notificationId}`, {
        method: 'POST',
        credentials: 'include',
        headers: getJsonHeaders(),
        body: JSON.stringify({ servedById: user?.id }),
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Failed to update ready status'));
      }
      await fetchReadyNotifications();
      setError('');
    } catch (ackError: any) {
      setError(ackError.message || 'Failed to update ready status');
    } finally {
      setAckLoadingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-6">
          <span className="cm-kicker">POS with table workflow</span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Point of Sale</h1>
          <p className="mt-2 text-sm text-slate-600">
            Waiters can save table orders. Cashier, manager, owner, and admin can finalize payment.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700">
            <span className="font-semibold">Role:</span>
            <span className="uppercase">{user?.role || '-'}</span>
            <span className="text-slate-400">|</span>
            <span>Order-only mode</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700">
            <span className="font-semibold">Device queue:</span>
            <span>{offlinePendingCount} pending sync</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700">
            <span className="font-semibold">Network:</span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
            <button
              type="button"
              onClick={syncOfflineQueueNow}
              disabled={!isOnline || syncingOfflineQueue || offlinePendingCount === 0}
              className="ml-1 rounded border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-700 disabled:opacity-50"
            >
              {syncingOfflineQueue ? 'Syncing...' : 'Sync now'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        <div className="cm-panel mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Offline Sync History</h2>
            <span className="text-xs text-slate-500">Last {offlineSyncHistory.length}</span>
          </div>
          {offlineSyncHistory.length === 0 ? (
            <p className="text-xs text-slate-500">No offline sync history yet.</p>
          ) : (
            <div className="space-y-2">
              {offlineSyncHistory.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold uppercase">{entry.event}</span>
                    <span className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-1">
                    Table {entry.tableNumber} · {entry.itemCount} item(s) · {entry.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cm-panel mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Ready Notifications</h2>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
              {readyNotifications.length} ready
            </span>
          </div>
          {readyNotifications.length === 0 ? (
            <p className="text-xs text-slate-500">No ready items yet.</p>
          ) : (
            <div className="space-y-2">
              {readyNotifications.slice(0, 6).map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <button
                    type="button"
                    onClick={() => item.tableNumber && handleSelectTable(item.tableNumber)}
                    className="text-left"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {item.itemName} x{item.quantity}
                    </p>
                    <p className="text-xs text-slate-600">
                      Table {item.tableNumber || '-'} · {item.orderNumber}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => markNotificationServed(item.id)}
                    disabled={ackLoadingId === item.id}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {ackLoadingId === item.id ? 'Updating...' : 'Mark Served'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cm-panel mb-6 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Dining Tables</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Available
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Occupied
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Selected
            </span>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              {canConfigureTables && (
                <>
                  <span>Table count</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={tableCountInput}
                    onChange={(e) => setTableCountInput(e.target.value)}
                    className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTableCount}
                    disabled={savingTableCount || !tableConfigBranchId}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    {savingTableCount ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
              <span>{tableLoading ? 'Loading table...' : `Selected table: T${tableNumber}`}</span>
              {openOrderId && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">Occupied</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {tableNumbers.map((table) => {
              const tableInfo = activeTableMap.get(table);
              const isOccupied = Boolean(tableInfo);
              const isSelected = tableNumber === table;
              return (
                <button
                  key={table}
                  onClick={() => handleSelectTable(table)}
                  className={`rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 shadow-sm'
                      : isOccupied
                        ? 'border-rose-300 bg-rose-50 hover:border-rose-400'
                        : 'border-emerald-300 bg-emerald-50 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Table {table}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isOccupied ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {isOccupied ? tableInfo?.orderNumber : 'Ready for new order'}
                  </p>
                  {isOccupied && (
                    <p className="mt-1 text-xs text-slate-500">Waiter: {tableInfo?.waiterName || '-'}</p>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="cm-panel p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Products</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Table:</span>
                <input
                  type="number"
                  min="1"
                  value={tableNumber}
                  onChange={(e) => handleSelectTable(parseInt(e.target.value, 10) || 1)}
                  className="cm-input w-20"
                />
              </div>
            </div>
            <div className="mb-4 space-y-3">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="cm-input"
                placeholder="Search products (name, SKU, label)"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setProductLabelFilter('all')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    productLabelFilter === 'all' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setProductLabelFilter('food')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    productLabelFilter === 'food' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  အစား
                </button>
                <button
                  type="button"
                  onClick={() => setProductLabelFilter('drink')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    productLabelFilter === 'drink' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  အသောက်
                </button>
                <button
                  type="button"
                  onClick={() => setProductLabelFilter('other')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    productLabelFilter === 'other' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  အခြား
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-slate-500">Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-slate-500">No products found for your search.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50"
                  >
                    <h3 className="font-medium text-slate-900">{product.name}</h3>
                    {product.menuLabel && (
                      <p className="mt-1 text-xs font-medium text-teal-700">
                        {product.menuLabel === 'food' ? 'အစား' : product.menuLabel === 'drink' ? 'အသောက်' : product.menuLabel === 'other' ? 'အခြား' : '-'}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-slate-600">{Number(product.price).toLocaleString()} MMK</p>
                    <p className="mt-1 text-xs text-slate-500">Stock: {product.stockQuantity}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="cm-panel min-w-0 overflow-hidden p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Current Order (T{tableNumber})</h2>
            <p className="mb-3 text-xs text-slate-500">
              {selectedTableInfo
                ? `Occupied by ${selectedTableInfo.waiterName || 'Unknown waiter'}`
                : 'This table is currently available.'}
            </p>
            {openOrderId && !editingExistingOrder && selectedTableInfo && (
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-slate-900">{selectedTableInfo.orderNumber}</p>
                    <p className="text-xs text-slate-600">
                      {selectedTableInfo.itemCount} items · {Number(selectedTableInfo.totalAmount || 0).toLocaleString()} MMK
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExistingOrder(true);
                      setError('');
                    }}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Add more items
                  </button>
                </div>
              </div>
            )}
            {tableReadyNotifications.length > 0 && (
              <div className="mb-3 rounded-lg border border-teal-200 bg-teal-50 p-2">
                {tableReadyNotifications.map((item) => (
                  <p key={item.id} className="text-xs font-medium text-teal-800">
                    READY: {item.itemName} x{item.quantity}
                  </p>
                ))}
              </div>
            )}
            <div className="mb-4 max-h-72 space-y-3 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="break-words text-sm text-slate-500">
                  {openOrderId && !editingExistingOrder
                    ? 'This table already has an order. Tap "Add more items" to add new products.'
                    : 'No items added yet'}
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-xs text-rose-500 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="cm-btn-secondary px-2 py-1"
                        >
                          -
                        </button>
                        <span className="text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="cm-btn-secondary px-2 py-1"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm text-slate-800">{(item.price * item.quantity).toLocaleString()} MMK</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{subtotal.toLocaleString()} MMK</span></div>
              <div className="flex justify-between text-slate-600"><span>Tax (5%)</span><span>{tax.toLocaleString()} MMK</span></div>
              <div className="flex justify-between text-base font-semibold text-slate-900"><span>Total</span><span>{total.toLocaleString()} MMK</span></div>
            </div>

            <div className="mt-4 space-y-3">
              <button
                onClick={saveTableOrder}
                disabled={saveLoading || cart.length === 0 || !canTakeOrders}
                className="cm-btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveLoading ? 'Saving...' : openOrderId ? 'Add Items To Order' : 'Save Table Order'}
              </button>

              <p className="break-words text-xs text-slate-500">
                Checkout and payment are handled in Orders screen by cashier/counter only.
              </p>
            </div>
          </div>
        </div>

        {receipt && (
          <div className="cm-panel mt-6 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Receipt generated</h3>
                <p className="text-sm text-slate-600">{receipt.receiptNumber} · {receipt.orderNumber}</p>
              </div>
              <button onClick={printReceipt} className="cm-btn-secondary">Print voucher</button>
            </div>
            <div className="grid gap-2 text-sm text-slate-700">
              {receipt.items.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="flex justify-between border-b border-slate-200 pb-2">
                  <span>{item.name} x{item.qty}</span>
                  <span>{item.total.toLocaleString()} MMK</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between text-slate-900"><span>Total</span><span>{receipt.totalAmount.toLocaleString()} MMK</span></div>
              <div className="text-slate-600">Paid by {receipt.paymentMethod}</div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
