'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Supplier {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  contactPerson: string;
  notes: string;
  branchId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  orderDate: string;
  expectedDeliveryDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes: string;
  supplierId: string;
  branchId: string;
  supplier: Supplier;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  product: Product;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function PurchasePage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchase-orders'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null);
  
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    contactPerson: '',
    notes: '',
    branchId: '',
    isActive: true,
  });
  
  const [purchaseOrderFormData, setPurchaseOrderFormData] = useState({
    status: 'draft',
    orderDate: '',
    expectedDeliveryDate: '',
    subtotal: '',
    taxAmount: '',
    discountAmount: '',
    totalAmount: '',
    notes: '',
    supplierId: '',
    branchId: '',
    items: [] as { productId: string; unitPrice: string; quantity: string; total: string }[],
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data in parallel
      const [suppliersRes, purchaseOrdersRes, productsRes, branchesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/suppliers`, {
          credentials: 'include',
          headers: authHeaders(),
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/purchase-orders`, {
          credentials: 'include',
          headers: authHeaders(),
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/products`, {
          credentials: 'include',
          headers: authHeaders(),
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/branches`, {
          credentials: 'include',
          headers: authHeaders(),
        })
      ]);

      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData);
      }

      if (purchaseOrdersRes.ok) {
        const purchaseOrdersData = await purchaseOrdersRes.json();
        setPurchaseOrders(purchaseOrdersData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData);
        if (branchesData.length > 0) {
          setPurchaseOrderFormData(prev => ({ ...prev, branchId: branchesData[0].id }));
          setSupplierFormData(prev => ({ ...prev, branchId: branchesData[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Supplier form handlers
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingSupplier 
        ? `${API_URL}/suppliers/${editingSupplier.id}`
        : `${API_URL}/suppliers`;
      
      const method = editingSupplier ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(supplierFormData),
      });
      
      if (response.ok) {
        await fetchData();
        resetSupplierForm();
        alert(editingSupplier ? 'Supplier updated successfully!' : 'Supplier created successfully!');
      } else {
        alert('Failed to save supplier');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error saving supplier');
    }
  };

  const handleSupplierEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierForm(true);
    
    setSupplierFormData({
      name: supplier.name,
      address: supplier.address,
      email: supplier.email || '',
      phone: supplier.phone || '',
      contactPerson: supplier.contactPerson || '',
      notes: supplier.notes || '',
      branchId: supplier.branchId || branches[0]?.id || '',
      isActive: supplier.isActive,
    });
  };

  const handleSupplierDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      const response = await fetch(`${API_URL}/suppliers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
      });
      
      if (response.ok) {
        await fetchData();
        alert('Supplier deleted successfully!');
      } else {
        alert('Failed to delete supplier');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error deleting supplier');
    }
  };

  const resetSupplierForm = () => {
    setEditingSupplier(null);
    setShowSupplierForm(false);
    setSupplierFormData({
      name: '',
      address: '',
      email: '',
      phone: '',
      contactPerson: '',
      notes: '',
      branchId: branches[0]?.id || '',
      isActive: true,
    });
  };

  // Purchase order form handlers
  const handlePurchaseOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPurchaseOrder 
        ? `${API_URL}/purchase-orders/${editingPurchaseOrder.id}`
        : `${API_URL}/purchase-orders`;
      
      const method = editingPurchaseOrder ? 'PATCH' : 'POST';
      
      // Convert form data to proper types
      const items = purchaseOrderFormData.items.map(item => ({
        productId: item.productId,
        unitPrice: parseFloat(item.unitPrice),
        quantity: parseInt(item.quantity),
        total: parseFloat(item.total),
      }));
      
      const payload = {
        status: purchaseOrderFormData.status,
        orderDate: purchaseOrderFormData.orderDate,
        expectedDeliveryDate: purchaseOrderFormData.expectedDeliveryDate || undefined,
        subtotal: purchaseOrderFormData.subtotal ? parseFloat(purchaseOrderFormData.subtotal) : undefined,
        taxAmount: purchaseOrderFormData.taxAmount ? parseFloat(purchaseOrderFormData.taxAmount) : undefined,
        discountAmount: purchaseOrderFormData.discountAmount ? parseFloat(purchaseOrderFormData.discountAmount) : undefined,
        totalAmount: purchaseOrderFormData.totalAmount ? parseFloat(purchaseOrderFormData.totalAmount) : undefined,
        notes: purchaseOrderFormData.notes,
        supplierId: purchaseOrderFormData.supplierId,
        branchId: purchaseOrderFormData.branchId,
        items: items.length > 0 ? items : undefined,
      };
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        await fetchData();
        resetPurchaseOrderForm();
        alert(editingPurchaseOrder ? 'Purchase order updated successfully!' : 'Purchase order created successfully!');
      } else {
        alert('Failed to save purchase order');
      }
    } catch (error) {
      console.error('Error saving purchase order:', error);
      alert('Error saving purchase order');
    }
  };

  const handlePurchaseOrderEdit = (purchaseOrder: PurchaseOrder) => {
    setEditingPurchaseOrder(purchaseOrder);
    setShowPurchaseOrderForm(true);
    
    setPurchaseOrderFormData({
      status: purchaseOrder.status,
      orderDate: purchaseOrder.orderDate.slice(0, 16), // Format for datetime-local input
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ? purchaseOrder.expectedDeliveryDate.slice(0, 16) : '',
      subtotal: purchaseOrder.subtotal.toString(),
      taxAmount: purchaseOrder.taxAmount.toString(),
      discountAmount: purchaseOrder.discountAmount.toString(),
      totalAmount: purchaseOrder.totalAmount.toString(),
      notes: purchaseOrder.notes || '',
      supplierId: purchaseOrder.supplierId,
      branchId: purchaseOrder.branchId,
      items: purchaseOrder.items.map(item => ({
        productId: item.productId,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity.toString(),
        total: item.total.toString(),
      })),
    });
  };

  const handlePurchaseOrderDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    
    try {
      const response = await fetch(`${API_URL}/purchase-orders/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
      });
      
      if (response.ok) {
        await fetchData();
        alert('Purchase order deleted successfully!');
      } else {
        alert('Failed to delete purchase order');
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      alert('Error deleting purchase order');
    }
  };

  const handleReceivePurchaseOrder = async (id: string) => {
    if (!confirm('Are you sure you want to mark this purchase order as received? This will update product stock quantities.')) return;
    
    try {
      const response = await fetch(`${API_URL}/purchase-orders/${id}/receive`, {
        method: 'PATCH',
        credentials: 'include',
        headers: authHeaders(),
      });
      
      if (response.ok) {
        await fetchData();
        alert('Purchase order marked as received successfully!');
      } else {
        alert('Failed to receive purchase order');
      }
    } catch (error) {
      console.error('Error receiving purchase order:', error);
      alert('Error receiving purchase order');
    }
  };

  const resetPurchaseOrderForm = () => {
    setEditingPurchaseOrder(null);
    setShowPurchaseOrderForm(false);
    setPurchaseOrderFormData({
      status: 'draft',
      orderDate: '',
      expectedDeliveryDate: '',
      subtotal: '',
      taxAmount: '',
      discountAmount: '',
      totalAmount: '',
      notes: '',
      supplierId: suppliers.length > 0 ? suppliers[0].id : '',
      branchId: branches.length > 0 ? branches[0].id : '',
      items: [],
    });
  };

  const addPurchaseItem = () => {
    setPurchaseOrderFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', unitPrice: '', quantity: '1', total: '' }]
    }));
  };

  const updatePurchaseItem = (index: number, field: string, value: string) => {
    setPurchaseOrderFormData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      
      // Auto-calculate total when unitPrice or quantity changes
      if ((field === 'unitPrice' || field === 'quantity') && items[index].unitPrice && items[index].quantity) {
        const unitPrice = parseFloat(items[index].unitPrice) || 0;
        const quantity = parseInt(items[index].quantity) || 0;
        items[index].total = (unitPrice * quantity).toString();
      }
      
      return { ...prev, items };
    });
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseOrderFormData(prev => {
      const items = [...prev.items];
      items.splice(index, 1);
      return { ...prev, items };
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'ordered': return 'Ordered';
      case 'received': return 'Received';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-blue-500';
      case 'ordered': return 'bg-indigo-500';
      case 'received': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100">
        
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Purchase Management</h1>
            <p className="text-slate-600">Manage suppliers and purchase orders</p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-slate-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'suppliers'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-600 hover:text-slate-600 hover:border-slate-300'
                }`}
              >
                Suppliers
              </button>
              <button
                onClick={() => setActiveTab('purchase-orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'purchase-orders'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-600 hover:text-slate-600 hover:border-slate-300'
                }`}
              >
                Purchase Orders
              </button>
            </nav>
          </div>

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Suppliers</h2>
                <button
                  onClick={() => setShowSupplierForm(!showSupplierForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                  {showSupplierForm ? 'Cancel' : 'Add Supplier'}
                </button>
              </div>

              {showSupplierForm && (
                <div className="bg-white/85 rounded-xl p-6 border border-slate-200 mb-8">
                  <h3 className="text-lg font-bold text-white mb-4">
                    {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                  </h3>
                  
                  <form onSubmit={handleSupplierSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-600 mb-2">Supplier Name *</label>
                      <input
                        type="text"
                        value={supplierFormData.name}
                        onChange={(e) => setSupplierFormData({...supplierFormData, name: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Contact Person</label>
                      <input
                        type="text"
                        value={supplierFormData.contactPerson}
                        onChange={(e) => setSupplierFormData({...supplierFormData, contactPerson: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-slate-600 mb-2">Address *</label>
                      <textarea
                        value={supplierFormData.address}
                        onChange={(e) => setSupplierFormData({...supplierFormData, address: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        rows={2}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Email</label>
                      <input
                        type="email"
                        value={supplierFormData.email}
                        onChange={(e) => setSupplierFormData({...supplierFormData, email: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Phone</label>
                      <input
                        type="text"
                        value={supplierFormData.phone}
                        onChange={(e) => setSupplierFormData({...supplierFormData, phone: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-slate-600 mb-2">Notes</label>
                      <textarea
                        value={supplierFormData.notes}
                        onChange={(e) => setSupplierFormData({...supplierFormData, notes: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Status</label>
                      <select
                        value={supplierFormData.isActive ? 'true' : 'false'}
                        onChange={(e) => setSupplierFormData({...supplierFormData, isActive: e.target.value === 'true'})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={resetSupplierForm}
                        className="bg-white hover:bg-slate-200 text-white px-4 py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                      >
                        {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white/85 rounded-xl p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Supplier List</h3>
                  <div className="text-slate-600">
                    Showing {suppliers.length} suppliers
                  </div>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-slate-600 mt-2">Loading suppliers...</p>
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-600">No suppliers found</p>
                    <button
                      onClick={() => setShowSupplierForm(true)}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      Add Your First Supplier
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Supplier</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Contact</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {suppliers.map((supplier) => (
                          <tr key={supplier.id} className="hover:bg-slate-50/90">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{supplier.name}</div>
                              <div className="text-sm text-slate-600">{supplier.address}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">{supplier.contactPerson || '-'}</div>
                              <div className="text-sm text-slate-600">
                                {supplier.email && <div>{supplier.email}</div>}
                                {supplier.phone && <div>{supplier.phone}</div>}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                supplier.isActive ? 'bg-green-500' : 'bg-red-500'
                              }`}>
                                {supplier.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleSupplierEdit(supplier)}
                                className="text-blue-400 hover:text-blue-300 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleSupplierDelete(supplier.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Purchase Orders Tab */}
          {activeTab === 'purchase-orders' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Purchase Orders</h2>
                <button
                  onClick={() => setShowPurchaseOrderForm(!showPurchaseOrderForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                  {showPurchaseOrderForm ? 'Cancel' : 'Add Purchase Order'}
                </button>
              </div>

              {showPurchaseOrderForm && (
                <div className="bg-white/85 rounded-xl p-6 border border-slate-200 mb-8">
                  <h3 className="text-lg font-bold text-white mb-4">
                    {editingPurchaseOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
                  </h3>
                  
                  <form onSubmit={handlePurchaseOrderSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-600 mb-2">Supplier *</label>
                      <select
                        value={purchaseOrderFormData.supplierId}
                        onChange={(e) => setPurchaseOrderFormData({...purchaseOrderFormData, supplierId: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="">Select a supplier</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Branch *</label>
                      <select
                        value={purchaseOrderFormData.branchId}
                        onChange={(e) => setPurchaseOrderFormData({...purchaseOrderFormData, branchId: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="">Select a branch</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Order Date *</label>
                      <input
                        type="datetime-local"
                        value={purchaseOrderFormData.orderDate}
                        onChange={(e) => setPurchaseOrderFormData({...purchaseOrderFormData, orderDate: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Expected Delivery Date</label>
                      <input
                        type="datetime-local"
                        value={purchaseOrderFormData.expectedDeliveryDate}
                        onChange={(e) => setPurchaseOrderFormData({...purchaseOrderFormData, expectedDeliveryDate: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Status *</label>
                      <select
                        value={purchaseOrderFormData.status}
                        onChange={(e) => setPurchaseOrderFormData({...purchaseOrderFormData, status: e.target.value as any})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="ordered">Ordered</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-slate-600 mb-2">Notes</label>
                      <textarea
                        value={purchaseOrderFormData.notes}
                        onChange={(e) => setPurchaseOrderFormData({...purchaseOrderFormData, notes: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        rows={2}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-slate-600">Items</label>
                        <button
                          type="button"
                          onClick={addPurchaseItem}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition"
                        >
                          Add Item
                        </button>
                      </div>
                      
                      {purchaseOrderFormData.items.length === 0 ? (
                        <div className="text-slate-600 text-center py-4">
                          No items added yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {purchaseOrderFormData.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-4">
                                <label className="block text-slate-600 text-xs mb-1">Product</label>
                                <select
                                  value={item.productId}
                                  onChange={(e) => updatePurchaseItem(index, 'productId', e.target.value)}
                                  className="w-full bg-white text-white rounded px-2 py-1 text-sm border border-slate-300 focus:border-blue-500 focus:outline-none"
                                >
                                  <option value="">Select product</option>
                                  {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                      {product.name} ({product.sku})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              <div className="col-span-2">
                                <label className="block text-slate-600 text-xs mb-1">Unit Price</label>
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => updatePurchaseItem(index, 'unitPrice', e.target.value)}
                                  className="w-full bg-white text-white rounded px-2 py-1 text-sm border border-slate-300 focus:border-blue-500 focus:outline-none"
                                  step="0.01"
                                />
                              </div>
                              
                              <div className="col-span-2">
                                <label className="block text-slate-600 text-xs mb-1">Quantity</label>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updatePurchaseItem(index, 'quantity', e.target.value)}
                                  className="w-full bg-white text-white rounded px-2 py-1 text-sm border border-slate-300 focus:border-blue-500 focus:outline-none"
                                  min="1"
                                />
                              </div>
                              
                              <div className="col-span-2">
                                <label className="block text-slate-600 text-xs mb-1">Total</label>
                                <input
                                  type="number"
                                  value={item.total}
                                  readOnly
                                  className="w-full bg-white text-white rounded px-2 py-1 text-sm border border-slate-300"
                                  step="0.01"
                                />
                              </div>
                              
                              <div className="col-span-2">
                                <button
                                  type="button"
                                  onClick={() => removePurchaseItem(index)}
                                  className="text-red-400 hover:text-red-300 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="md:col-span-2 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={resetPurchaseOrderForm}
                        className="bg-white hover:bg-slate-200 text-white px-4 py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                      >
                        {editingPurchaseOrder ? 'Update Purchase Order' : 'Create Purchase Order'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white/85 rounded-xl p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Purchase Orders</h3>
                  <div className="text-slate-600">
                    Showing {purchaseOrders.length} purchase orders
                  </div>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-slate-600 mt-2">Loading purchase orders...</p>
                  </div>
                ) : purchaseOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-600">No purchase orders found</p>
                    <button
                      onClick={() => setShowPurchaseOrderForm(true)}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      Create Your First Purchase Order
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Order</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Supplier</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {purchaseOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50/90">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{order.orderNumber}</div>
                              <div className="text-sm text-slate-600">
                                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{order.supplier.name}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">
                                {new Date(order.orderDate).toLocaleDateString()}
                              </div>
                              {order.expectedDeliveryDate && (
                                <div className="text-sm text-slate-600">
                                  Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">
                                {order.totalAmount.toLocaleString()} MMK
                              </div>
                              {order.discountAmount > 0 && (
                                <div className="text-sm text-slate-600">
                                  Disc: {order.discountAmount.toLocaleString()} MMK
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handlePurchaseOrderEdit(order)}
                                className="text-blue-400 hover:text-blue-300 mr-3"
                              >
                                Edit
                              </button>
                              {order.status !== 'received' && (
                                <button
                                  onClick={() => handleReceivePurchaseOrder(order.id)}
                                  className="text-green-400 hover:text-green-300 mr-3"
                                >
                                  Receive
                                </button>
                              )}
                              <button
                                onClick={() => handlePurchaseOrderDelete(order.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  });
