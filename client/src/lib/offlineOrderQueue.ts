type SaveTableOrderPayload = {
  tableNumber: number;
  type: string;
  branchId: string | null;
  createdById?: string;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }>;
};

type QueueJob = {
  id: string;
  type: 'save_table_order';
  payload: SaveTableOrderPayload;
  createdAt: string;
};

export type OfflineSyncHistoryEntry = {
  id: string;
  queueJobId: string;
  event: 'queued' | 'synced' | 'retry' | 'dropped';
  tableNumber: number;
  itemCount: number;
  createdAt: string;
  message: string;
};

const DB_NAME = 'odex_offline_db_v1';
const DB_VERSION = 1;
const QUEUE_STORE = 'order_queue';
const HISTORY_STORE = 'sync_history';
const HISTORY_LIMIT = 100;

const FALLBACK_QUEUE_KEY = 'odex_offline_order_queue_v1';
const FALLBACK_HISTORY_KEY = 'odex_offline_sync_history_v1';

function hasIndexedDB(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readFallbackQueue(): QueueJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FALLBACK_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackQueue(queue: QueueJob[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FALLBACK_QUEUE_KEY, JSON.stringify(queue));
}

function readFallbackHistory(): OfflineSyncHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FALLBACK_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackHistory(entries: OfflineSyncHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FALLBACK_HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
}

async function readAllQueue(): Promise<QueueJob[]> {
  if (!hasIndexedDB()) return readFallbackQueue();
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve((req.result as QueueJob[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return readFallbackQueue();
  }
}

async function writeAllQueue(queue: QueueJob[]): Promise<void> {
  if (!hasIndexedDB()) {
    writeFallbackQueue(queue);
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const clearReq = store.clear();
      clearReq.onerror = () => reject(clearReq.error);
      clearReq.onsuccess = () => {
        for (const item of queue) {
          store.put(item);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    writeFallbackQueue(queue);
  } catch {
    writeFallbackQueue(queue);
  }
}

async function readAllHistory(): Promise<OfflineSyncHistoryEntry[]> {
  if (!hasIndexedDB()) return readFallbackHistory();
  try {
    const db = await openDb();
    const items = await new Promise<OfflineSyncHistoryEntry[]>((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const req = tx.objectStore(HISTORY_STORE).getAll();
      req.onsuccess = () => resolve((req.result as OfflineSyncHistoryEntry[]) || []);
      req.onerror = () => reject(req.error);
    });
    return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return readFallbackHistory();
  }
}

async function writeAllHistory(entries: OfflineSyncHistoryEntry[]): Promise<void> {
  const trimmed = entries
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, HISTORY_LIMIT);

  if (!hasIndexedDB()) {
    writeFallbackHistory(trimmed);
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const clearReq = store.clear();
      clearReq.onerror = () => reject(clearReq.error);
      clearReq.onsuccess = () => {
        for (const item of trimmed) {
          store.put(item);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    writeFallbackHistory(trimmed);
  } catch {
    writeFallbackHistory(trimmed);
  }
}

async function appendHistory(entry: Omit<OfflineSyncHistoryEntry, 'id' | 'createdAt'>): Promise<void> {
  const next: OfflineSyncHistoryEntry = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  const current = await readAllHistory();
  await writeAllHistory([next, ...current]);
}

export async function getPendingQueueCount(): Promise<number> {
  const queue = await readAllQueue();
  return queue.length;
}

export async function getOfflineSyncHistory(limit = 20): Promise<OfflineSyncHistoryEntry[]> {
  const history = await readAllHistory();
  return history.slice(0, Math.max(1, limit));
}

export async function enqueueSaveTableOrder(payload: SaveTableOrderPayload): Promise<void> {
  const queue = await readAllQueue();
  const job: QueueJob = {
    id: makeId(),
    type: 'save_table_order',
    payload,
    createdAt: new Date().toISOString(),
  };
  queue.push(job);
  await writeAllQueue(queue);
  await appendHistory({
    queueJobId: job.id,
    event: 'queued',
    tableNumber: payload.tableNumber,
    itemCount: payload.items.length,
    message: 'Saved locally while offline',
  });
}

export async function flushOfflineQueue(apiUrl: string, token?: string): Promise<{ synced: number; pending: number }> {
  const queue = await readAllQueue();
  if (queue.length === 0) return { synced: 0, pending: 0 };

  let synced = 0;
  const pending: QueueJob[] = [];

  for (const job of queue) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/pos/orders/save`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(job.payload),
      });

      if (!response.ok) {
        if (response.status >= 500) {
          pending.push(job);
          await appendHistory({
            queueJobId: job.id,
            event: 'retry',
            tableNumber: job.payload.tableNumber,
            itemCount: job.payload.items.length,
            message: `Retry required (server ${response.status})`,
          });
        } else {
          await appendHistory({
            queueJobId: job.id,
            event: 'dropped',
            tableNumber: job.payload.tableNumber,
            itemCount: job.payload.items.length,
            message: `Dropped (client ${response.status})`,
          });
        }
        continue;
      }

      synced += 1;
      await appendHistory({
        queueJobId: job.id,
        event: 'synced',
        tableNumber: job.payload.tableNumber,
        itemCount: job.payload.items.length,
        message: 'Synced to server',
      });
    } catch {
      pending.push(job);
      await appendHistory({
        queueJobId: job.id,
        event: 'retry',
        tableNumber: job.payload.tableNumber,
        itemCount: job.payload.items.length,
        message: 'Retry required (network error)',
      });
    }
  }

  await writeAllQueue(pending);
  return { synced, pending: pending.length };
}
