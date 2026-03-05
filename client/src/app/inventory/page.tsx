'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import { useAuth } from '@/contexts/AuthContext';

type ProductType = 'sellable' | 'ingredient';
type MenuLabel = '' | 'food' | 'drink' | 'other';

type BomItem = {
  ingredientProductId: string;
  quantity: number;
};

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  productType: ProductType;
  usesBom: boolean;
  sendToKitchen: boolean;
  menuLabel?: string | null;
  bom?: BomItem[] | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState({
    name: '',
    sku: '',
    price: '',
    productType: 'sellable' as ProductType,
    usesBom: false,
    sendToKitchen: false,
    menuLabel: '',
  });
  const [editBomDraft, setEditBomDraft] = useState<BomItem[]>([{ ingredientProductId: '', quantity: 1 }]);
  const [activeStockBox, setActiveStockBox] = useState<'total' | 'inStock' | 'lowStock' | 'outOfStock' | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalSort, setModalSort] = useState<'stockDesc' | 'stockAsc' | 'nameAsc' | 'nameDesc'>('stockDesc');
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: '',
    stockQuantity: '',
    productType: 'sellable' as ProductType,
    usesBom: false,
    sendToKitchen: false,
    menuLabel: '',
  });

  const toMenuLabel = (value: string | null | undefined): MenuLabel => {
    if (value === 'food' || value === 'drink' || value === 'other') return value;
    return '';
  };

  const menuLabelText = (value: string | null | undefined): string => {
    if (value === 'food') return 'အစား';
    if (value === 'drink') return 'အသောက်';
    if (value === 'other') return 'အခြား';
    return '-';
  };

  const [bomDraft, setBomDraft] = useState<BomItem[]>([{ ingredientProductId: '', quantity: 1 }]);

  const ingredientProducts = useMemo(
    () => products.filter((product) => product.productType === 'ingredient' && product.isActive),
    [products],
  );

  const getAuthHeaders = (withContentType = false): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers: Record<string, string> = {};
    if (withContentType) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products?activeOnly=true`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const data = await response.json();
      setProducts(data);
      setError('');
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!activeStockBox) {
      setModalSearch('');
      setModalSort('stockDesc');
    }
  }, [activeStockBox]);

  const handleAddProduct = async () => {
    if (!newProduct.name) {
      setError('Product name is required');
      return;
    }

    try {
      const sku = newProduct.sku.trim();
      const createResponse = await fetch(`${API_URL}/products`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          ...newProduct,
          sku: sku || undefined,
          price: Number(newProduct.price || 0),
          stockQuantity: Number(newProduct.stockQuantity || 0),
          branchId: user?.branchId || null,
          usesBom: newProduct.productType === 'sellable' ? newProduct.usesBom : false,
          sendToKitchen: newProduct.productType === 'sellable' ? newProduct.sendToKitchen : false,
          menuLabel: newProduct.productType === 'sellable' ? newProduct.menuLabel : null,
        }),
      });

      if (!createResponse.ok) {
        const err = await createResponse.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to create product');
      }

      const created = await createResponse.json();

      if (newProduct.productType === 'sellable' && newProduct.usesBom) {
        const cleanBom = bomDraft.filter((item) => item.ingredientProductId && item.quantity > 0);
        const bomResponse = await fetch(`${API_URL}/products/${created.id}/bom`, {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders(true),
          body: JSON.stringify({ bom: cleanBom }),
        });

        if (!bomResponse.ok) {
          const err = await bomResponse.json();
          throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to save BOM');
        }
      }

      setNewProduct({
        name: '',
        sku: '',
        price: '',
        stockQuantity: '',
        productType: 'sellable',
        usesBom: false,
        sendToKitchen: false,
        menuLabel: '',
      });
      setBomDraft([{ ingredientProductId: '', quantity: 1 }]);
      setShowAddForm(false);
      await fetchProducts();
      setError('');
    } catch (createError: any) {
      setError(createError.message || 'Failed to create product');
    }
  };

  const updateStock = async (productId: string, quantity: number, action: 'add' | 'remove' | 'adjust') => {
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError('Invalid quantity');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/inventory/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          productId,
          quantity,
          branchId: user?.branchId || null,
          createdById: user?.id,
          notes: `Stock ${action} via UI`,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || `Failed to ${action} stock`);
      }

      await fetchProducts();
      setError('');
    } catch (updateError: any) {
      setError(updateError.message || `Error ${action}ing stock`);
    }
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProduct({
      name: product.name,
      sku: product.sku || '',
      price: String(Number(product.price || 0)),
      productType: product.productType,
      usesBom: Boolean(product.usesBom),
      sendToKitchen: Boolean(product.sendToKitchen),
      menuLabel: toMenuLabel(product.menuLabel),
    });
    setEditBomDraft(
      product.bom && product.bom.length > 0
        ? product.bom.map((item) => ({
            ingredientProductId: item.ingredientProductId,
            quantity: Number(item.quantity) || 1,
          }))
        : [{ ingredientProductId: '', quantity: 1 }],
    );
  };

  const closeEditProduct = () => {
    setEditingProduct(null);
    setEditProduct({
      name: '',
      sku: '',
      price: '',
      productType: 'sellable',
      usesBom: false,
      sendToKitchen: false,
      menuLabel: '',
    });
    setEditBomDraft([{ ingredientProductId: '', quantity: 1 }]);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    if (!editProduct.name.trim()) {
      setError('Product name is required');
      return;
    }

    try {
      const payload: any = {
        name: editProduct.name.trim(),
        sku: (editProduct.sku || editingProduct.sku).trim(),
        price: Number(editProduct.price || 0),
        usesBom: editProduct.productType === 'sellable' ? editProduct.usesBom : false,
        sendToKitchen: editProduct.productType === 'sellable' ? editProduct.sendToKitchen : false,
        menuLabel: editProduct.productType === 'sellable' ? editProduct.menuLabel : null,
      };

      payload.bom =
        editProduct.productType === 'sellable' && editProduct.usesBom
          ? editBomDraft.filter((item) => item.ingredientProductId && Number(item.quantity) > 0)
          : [];

      const response = await fetch(`${API_URL}/products/${editingProduct.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to update product');
      }

      await fetchProducts();
      closeEditProduct();
      setError('');
    } catch (updateError: any) {
      setError(updateError.message || 'Failed to update product');
    }
  };

  const totalProducts = products.length;
  const inStock = products.filter((p) => p.stockQuantity > 0).length;
  const lowStock = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
  const outOfStock = products.filter((p) => p.stockQuantity === 0).length;

  const selectedProducts = useMemo(() => {
    if (activeStockBox === 'total') return products;
    if (activeStockBox === 'inStock') return products.filter((p) => p.stockQuantity > 0);
    if (activeStockBox === 'lowStock') return products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10);
    if (activeStockBox === 'outOfStock') return products.filter((p) => p.stockQuantity === 0);
    return [];
  }, [activeStockBox, products]);

  const selectedTitle = useMemo(() => {
    if (activeStockBox === 'total') return 'Total Products';
    if (activeStockBox === 'inStock') return 'In Stock Products';
    if (activeStockBox === 'lowStock') return 'Low Stock Products';
    if (activeStockBox === 'outOfStock') return 'Out of Stock Products';
    return 'Products';
  }, [activeStockBox]);

  const selectedProductsView = useMemo(() => {
    const keyword = modalSearch.trim().toLowerCase();
    const filtered = selectedProducts.filter((product) => {
      if (!keyword) return true;
      return product.name.toLowerCase().includes(keyword) || product.sku.toLowerCase().includes(keyword);
    });

    const sorted = [...filtered];
    if (modalSort === 'stockAsc') {
      sorted.sort((a, b) => a.stockQuantity - b.stockQuantity);
    } else if (modalSort === 'nameAsc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (modalSort === 'nameDesc') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      sorted.sort((a, b) => b.stockQuantity - a.stockQuantity);
    }
    return sorted;
  }, [modalSearch, modalSort, selectedProducts]);

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-6">
          <span className="cm-kicker">Inventory and product strategy</span>
          <h1 className="mt-3 text-3xl font-semibold text-white">Inventory</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            `Ingredient` items are consumed by BOM. `Sellable` items can be sold directly or consume ingredients through BOM.
          </p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{error}</div>}

        <div className="cm-panel p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Product Inventory</h2>
            <button onClick={() => setShowAddForm(true)} className="cm-btn-primary">
              Add Product
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveStockBox('total')}
              className="rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300/40 hover:bg-black/30"
            >
              <div className="text-3xl font-bold text-white">{totalProducts}</div>
              <div className="font-medium text-slate-700">Total Products</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveStockBox('inStock')}
              className="rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300/40 hover:bg-black/30"
            >
              <div className="text-3xl font-bold text-emerald-300">{inStock}</div>
              <div className="font-medium text-slate-700">In Stock</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveStockBox('lowStock')}
              className="rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300/40 hover:bg-black/30"
            >
              <div className="text-3xl font-bold text-amber-300">{lowStock}</div>
              <div className="font-medium text-slate-700">Low Stock</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveStockBox('outOfStock')}
              className="rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300/40 hover:bg-black/30"
            >
              <div className="text-3xl font-bold text-rose-300">{outOfStock}</div>
              <div className="font-medium text-slate-700">Out of Stock</div>
            </button>
          </div>

          {showAddForm && (
            <div className="mb-6 rounded-xl border border-white/10 bg-black/25 p-4">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Add New Product</h3>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Product Name</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="cm-input"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">SKU (optional)</label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="cm-input"
                    placeholder="Leave empty for auto-generate"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Price (MMK)</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="cm-input"
                    placeholder="Enter price"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Initial Stock</label>
                  <input
                    type="number"
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                    className="cm-input"
                    placeholder="Enter stock"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Product Type</label>
                  <select
                    value={newProduct.productType}
                    onChange={(e) => setNewProduct({ ...newProduct, productType: e.target.value as ProductType })}
                    className="cm-input"
                  >
                    <option value="sellable">Sellable</option>
                    <option value="ingredient">Ingredient</option>
                  </select>
                </div>
                {newProduct.productType === 'sellable' && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Product Label</label>
                    <select
                      value={newProduct.menuLabel}
                      onChange={(e) => setNewProduct({ ...newProduct, menuLabel: e.target.value as MenuLabel })}
                      className="cm-input"
                    >
                      <option value="">ရွေးပါ</option>
                      <option value="food">အစား</option>
                      <option value="drink">အသောက်</option>
                      <option value="other">အခြား</option>
                    </select>
                  </div>
                )}
                {newProduct.productType === 'sellable' && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Inventory Strategy</label>
                    <select
                      value={newProduct.usesBom ? 'bom' : 'direct'}
                      onChange={(e) => setNewProduct({ ...newProduct, usesBom: e.target.value === 'bom' })}
                      className="cm-input"
                    >
                      <option value="direct">Sell from this item's own stock</option>
                      <option value="bom">Consume ingredient stock via BOM</option>
                    </select>
                  </div>
                )}
                {newProduct.productType === 'sellable' && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">KDS Routing</label>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={newProduct.sendToKitchen}
                        onChange={(e) => setNewProduct({ ...newProduct, sendToKitchen: e.target.checked })}
                      />
                      Send this item to KDS when sold
                    </label>
                  </div>
                )}
              </div>

              {newProduct.productType === 'sellable' && newProduct.usesBom && (
                <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Bill of Materials (BOM)</h4>
                  {bomDraft.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,120px,80px]">
                      <select
                        value={item.ingredientProductId}
                        onChange={(e) => {
                          const next = [...bomDraft];
                          next[index] = { ...next[index], ingredientProductId: e.target.value };
                          setBomDraft(next);
                        }}
                        className="cm-input"
                      >
                        <option value="">Select ingredient</option>
                        {ingredientProducts.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...bomDraft];
                          next[index] = { ...next[index], quantity: Number(e.target.value) };
                          setBomDraft(next);
                        }}
                        className="cm-input"
                        placeholder="Qty"
                      />
                      <button
                        onClick={() => setBomDraft(bomDraft.filter((_, i) => i !== index))}
                        className="cm-btn-secondary"
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBomDraft([...bomDraft, { ingredientProductId: '', quantity: 1 }])}
                    className="cm-btn-secondary"
                  >
                    Add BOM Item
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleAddProduct} className="cm-btn-primary">
                  Save Product
                </button>
                <button onClick={() => setShowAddForm(false)} className="cm-btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-slate-600">Loading products...</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {products.map((product) => (
                  <div key={product.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                        <p className="text-xs font-medium text-slate-600">{product.sku}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        {product.productType}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <p><span className="font-semibold">Price:</span> {Number(product.price).toLocaleString()} MMK</p>
                      <p><span className="font-semibold">Stock:</span> {product.stockQuantity}</p>
                      <p><span className="font-semibold">Label:</span> {menuLabelText(product.menuLabel)}</p>
                      <p><span className="font-semibold">KDS:</span> {product.sendToKitchen ? 'Yes' : 'No'}</p>
                      <p><span className="font-semibold">Strategy:</span> {product.usesBom ? 'BOM' : 'Direct'}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button
                        onClick={() => startEditProduct(product)}
                        className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-medium text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          const qty = prompt('Quantity to add:');
                          if (qty) updateStock(product.id, Number(qty), 'add');
                        }}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          const qty = prompt('Quantity to remove:');
                          if (qty) updateStock(product.id, Number(qty), 'remove');
                        }}
                        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => {
                          const qty = prompt('Set exact stock quantity:');
                          if (qty) updateStock(product.id, Number(qty), 'adjust');
                        }}
                        className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 font-medium text-sky-700"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-white/10">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Label</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">KDS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-slate-900">{product.name}</div>
                          <div className="text-xs font-medium text-slate-600">{product.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700">
                          {product.productType}
                          {product.usesBom ? ' (BOM)' : ''}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700">{menuLabelText(product.menuLabel)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{Number(product.price).toLocaleString()} MMK</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700">{product.sendToKitchen ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{product.stockQuantity}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditProduct(product)}
                              className="text-indigo-600 hover:text-indigo-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                const qty = prompt('Quantity to add:');
                                if (qty) updateStock(product.id, Number(qty), 'add');
                              }}
                              className="text-[#8dd8ce] hover:text-[#b6fff3]"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                const qty = prompt('Quantity to remove:');
                                if (qty) updateStock(product.id, Number(qty), 'remove');
                              }}
                              className="text-amber-300 hover:text-amber-200"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => {
                                const qty = prompt('Set exact stock quantity:');
                                if (qty) updateStock(product.id, Number(qty), 'adjust');
                              }}
                              className="text-sky-300 hover:text-sky-200"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <Modal
          open={Boolean(activeStockBox)}
          title={`${selectedTitle} (${selectedProducts.length})`}
          onClose={() => setActiveStockBox(null)}
        >
          <div className="mb-3 grid gap-2 md:grid-cols-[1fr,200px]">
            <input
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Search by product name or SKU"
            />
            <select
              value={modalSort}
              onChange={(e) => setModalSort(e.target.value as 'stockDesc' | 'stockAsc' | 'nameAsc' | 'nameDesc')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="stockDesc">Sort: Stock (high to low)</option>
              <option value="stockAsc">Sort: Stock (low to high)</option>
              <option value="nameAsc">Sort: Name (A-Z)</option>
              <option value="nameDesc">Sort: Name (Z-A)</option>
            </select>
          </div>

          {selectedProductsView.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No products found for this category.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Product</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">SKU</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Label</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Stock</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-600">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedProductsView.map((product) => {
                    const status =
                      product.stockQuantity === 0
                        ? 'Out of stock'
                        : product.stockQuantity <= 10
                          ? 'Low stock'
                          : 'In stock';

                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{product.sku}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {product.productType}
                          {product.usesBom ? ' (BOM)' : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{menuLabelText(product.menuLabel)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{product.stockQuantity}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{status}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditProduct(product)}
                              className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const qty = prompt(`Add quantity to ${product.name}:`);
                                if (qty) updateStock(product.id, Number(qty), 'add');
                              }}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const qty = prompt(`Remove quantity from ${product.name}:`);
                                if (qty) updateStock(product.id, Number(qty), 'remove');
                              }}
                              className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const qty = prompt(`Set exact stock for ${product.name}:`);
                                if (qty) updateStock(product.id, Number(qty), 'adjust');
                              }}
                              className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Modal>

        <Modal
          open={Boolean(editingProduct)}
          title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Edit Product'}
          onClose={closeEditProduct}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Product Name</label>
              <input
                type="text"
                value={editProduct.name}
                onChange={(e) => setEditProduct((prev) => ({ ...prev, name: e.target.value }))}
                className="cm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">SKU</label>
              <input
                type="text"
                value={editProduct.sku}
                onChange={(e) => setEditProduct((prev) => ({ ...prev, sku: e.target.value }))}
                className="cm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Price (MMK)</label>
              <input
                type="number"
                value={editProduct.price}
                onChange={(e) => setEditProduct((prev) => ({ ...prev, price: e.target.value }))}
                className="cm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Product Type</label>
              <input
                type="text"
                value={editProduct.productType}
                disabled
                className="cm-input cursor-not-allowed opacity-70"
              />
            </div>
            {editProduct.productType === 'sellable' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Product Label</label>
                  <select
                    value={editProduct.menuLabel}
                    onChange={(e) => setEditProduct((prev) => ({ ...prev, menuLabel: e.target.value as MenuLabel }))}
                    className="cm-input"
                  >
                    <option value="">ရွေးပါ</option>
                    <option value="food">အစား</option>
                    <option value="drink">အသောက်</option>
                    <option value="other">အခြား</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Inventory Strategy</label>
                  <select
                    value={editProduct.usesBom ? 'bom' : 'direct'}
                    onChange={(e) => setEditProduct((prev) => ({ ...prev, usesBom: e.target.value === 'bom' }))}
                    className="cm-input"
                  >
                    <option value="direct">Sell from this item's own stock</option>
                    <option value="bom">Consume ingredient stock via BOM</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">KDS Routing</label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editProduct.sendToKitchen}
                      onChange={(e) => setEditProduct((prev) => ({ ...prev, sendToKitchen: e.target.checked }))}
                    />
                    Send this item to KDS when sold
                  </label>
                </div>
              </>
            )}
          </div>

          {editProduct.productType === 'sellable' && editProduct.usesBom && (
            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Bill of Materials (BOM)</h4>
              {editBomDraft.map((item, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,120px,80px]">
                  <select
                    value={item.ingredientProductId}
                    onChange={(e) => {
                      const next = [...editBomDraft];
                      next[index] = { ...next[index], ingredientProductId: e.target.value };
                      setEditBomDraft(next);
                    }}
                    className="cm-input"
                  >
                    <option value="">Select ingredient</option>
                    {ingredientProducts.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...editBomDraft];
                      next[index] = { ...next[index], quantity: Number(e.target.value) };
                      setEditBomDraft(next);
                    }}
                    className="cm-input"
                    placeholder="Qty"
                  />
                  <button
                    onClick={() => setEditBomDraft(editBomDraft.filter((_, i) => i !== index))}
                    className="cm-btn-secondary"
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEditBomDraft([...editBomDraft, { ingredientProductId: '', quantity: 1 }])}
                className="cm-btn-secondary"
              >
                Add BOM Item
              </button>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={handleUpdateProduct} className="cm-btn-primary">
              Save Changes
            </button>
            <button type="button" onClick={closeEditProduct} className="cm-btn-secondary">
              Cancel
            </button>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
