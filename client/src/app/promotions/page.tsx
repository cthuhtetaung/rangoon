'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'package' | 'buy_x_get_y';
  discountType?: 'percentage' | 'fixed_amount';
  discountValue?: number;
  packagePrice?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  minOrderAmount: number;
  buyQuantity: number;
  freeQuantity: number;
  branchId: string;
  products: Product[];
  freeProducts: Product[];
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'discount',
    discountType: 'percentage',
    discountValue: '',
    packagePrice: '',
    startDate: '',
    endDate: '',
    isActive: true,
    minOrderAmount: '0',
    buyQuantity: '1',
    freeQuantity: '1',
    branchId: '',
    productIds: [] as string[],
    freeProductIds: [] as string[],
  });

  // Fetch branches, products, and promotions on component mount
  useEffect(() => {
    fetchBranches();
    fetchProducts();
    fetchPromotions();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_URL}/branches`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, branchId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/promotions`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPromotions(data);
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPromotion 
        ? `${API_URL}/promotions/${editingPromotion.id}`
        : `${API_URL}/promotions`;
      
      const method = editingPromotion ? 'PATCH' : 'POST';
      
      const payload = {
        ...formData,
        discountValue: formData.discountValue ? parseFloat(formData.discountValue) : undefined,
        packagePrice: formData.packagePrice ? parseFloat(formData.packagePrice) : undefined,
        minOrderAmount: parseInt(formData.minOrderAmount),
        buyQuantity: parseInt(formData.buyQuantity),
        freeQuantity: parseInt(formData.freeQuantity),
        productIds: formData.productIds,
        freeProductIds: formData.freeProductIds,
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
        await fetchPromotions();
        resetForm();
        alert(editingPromotion ? 'Promotion updated successfully!' : 'Promotion created successfully!');
      } else {
        alert('Failed to save promotion');
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('Error saving promotion');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setShowForm(true);
    
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      discountType: promotion.discountType || 'percentage',
      discountValue: promotion.discountValue?.toString() || '',
      packagePrice: promotion.packagePrice?.toString() || '',
      startDate: promotion.startDate.slice(0, 16), // Format for datetime-local input
      endDate: promotion.endDate.slice(0, 16), // Format for datetime-local input
      isActive: promotion.isActive,
      minOrderAmount: promotion.minOrderAmount.toString(),
      buyQuantity: promotion.buyQuantity.toString(),
      freeQuantity: promotion.freeQuantity.toString(),
      branchId: promotion.branchId,
      productIds: promotion.products.map(p => p.id),
      freeProductIds: promotion.freeProducts.map(p => p.id),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    
    try {
      const response = await fetch(`${API_URL}/promotions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
      });
      
      if (response.ok) {
        await fetchPromotions();
        alert('Promotion deleted successfully!');
      } else {
        alert('Failed to delete promotion');
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert('Error deleting promotion');
    }
  };

  const resetForm = () => {
    setEditingPromotion(null);
    setShowForm(false);
    setFormData({
      name: '',
      description: '',
      type: 'discount',
      discountType: 'percentage',
      discountValue: '',
      packagePrice: '',
      startDate: '',
      endDate: '',
      isActive: true,
      minOrderAmount: '0',
      buyQuantity: '1',
      freeQuantity: '1',
      branchId: branches.length > 0 ? branches[0].id : '',
      productIds: [],
      freeProductIds: [],
    });
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'discount': return 'Discount';
      case 'package': return 'Package/Set Menu';
      case 'buy_x_get_y': return 'Buy X Get Y';
      default: return type;
    }
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500' : 'bg-red-500';
  };

  const renderPromotionDetails = (promotion: Promotion) => {
    switch (promotion.type) {
      case 'discount':
        if (promotion.discountType === 'percentage') {
          return `${promotion.discountValue}% off`;
        } else if (promotion.discountType === 'fixed_amount') {
          return `${promotion.discountValue?.toLocaleString()} MMK off`;
        }
        return '';
      case 'package':
        return `${promotion.packagePrice?.toLocaleString()} MMK for package`;
      case 'buy_x_get_y':
        return `Buy ${promotion.buyQuantity}, Get ${promotion.freeQuantity} Free`;
      default:
        return '';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100">
        
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Promotions</h1>
                <p className="text-slate-600">Manage discounts, packages, and special offers</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                {showForm ? 'Cancel' : 'Add Promotion'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="bg-white/85 rounded-xl p-6 border border-slate-200 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
              </h2>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-600 mb-2">Promotion Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-600 mb-2">Branch</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                    className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                  >
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-slate-600 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-slate-600 mb-2">Promotion Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="discount">Discount</option>
                    <option value="package">Package/Set Menu</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-slate-600 mb-2">Status</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                    className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-slate-600 mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-600 mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                
                {formData.type === 'discount' && (
                  <>
                    <div>
                      <label className="block text-slate-600 mb-2">Discount Type</label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({...formData, discountType: e.target.value as any})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount (MMK)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">
                        {formData.discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                      </label>
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </>
                )}
                
                {formData.type === 'package' && (
                  <div>
                    <label className="block text-slate-600 mb-2">Package Price (MMK)</label>
                    <input
                      type="number"
                      value={formData.packagePrice}
                      onChange={(e) => setFormData({...formData, packagePrice: e.target.value})}
                      className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                      min="0"
                      step="1"
                    />
                  </div>
                )}
                
                {(formData.type === 'package' || formData.type === 'buy_x_get_y') && (
                  <div>
                    <label className="block text-slate-600 mb-2">Minimum Order Amount (MMK)</label>
                    <input
                      type="number"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({...formData, minOrderAmount: e.target.value})}
                      className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                      min="0"
                      step="1"
                    />
                  </div>
                )}
                
                {formData.type === 'buy_x_get_y' && (
                  <>
                    <div>
                      <label className="block text-slate-600 mb-2">Buy Quantity</label>
                      <input
                        type="number"
                        value={formData.buyQuantity}
                        onChange={(e) => setFormData({...formData, buyQuantity: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-slate-600 mb-2">Free Quantity</label>
                      <input
                        type="number"
                        value={formData.freeQuantity}
                        onChange={(e) => setFormData({...formData, freeQuantity: e.target.value})}
                        className="w-full bg-white text-white rounded-lg px-3 py-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                        min="1"
                      />
                    </div>
                  </>
                )}
                
                <div className="md:col-span-2">
                  <label className="block text-slate-600 mb-2">Products</label>
                  <div className="bg-white rounded-lg p-4 max-h-40 overflow-y-auto">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={formData.productIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                productIds: [...formData.productIds, product.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                productIds: formData.productIds.filter(id => id !== product.id)
                              });
                            }
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`product-${product.id}`} className="text-white">
                          {product.name} ({product.sku}) - {product.price.toLocaleString()} MMK
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {formData.type === 'buy_x_get_y' && (
                  <div className="md:col-span-2">
                    <label className="block text-slate-600 mb-2">Free Products</label>
                    <div className="bg-white rounded-lg p-4 max-h-40 overflow-y-auto">
                      {products.map(product => (
                        <div key={`free-${product.id}`} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`free-product-${product.id}`}
                            checked={formData.freeProductIds.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  freeProductIds: [...formData.freeProductIds, product.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  freeProductIds: formData.freeProductIds.filter(id => id !== product.id)
                                });
                              }
                            }}
                            className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={`free-product-${product.id}`} className="text-white">
                            {product.name} ({product.sku}) - {product.price.toLocaleString()} MMK
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="md:col-span-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-white hover:bg-slate-200 text-white px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white/85 rounded-xl p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Promotion List</h2>
              <div className="text-slate-600">
                Showing {promotions.length} promotions
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-slate-600 mt-2">Loading promotions...</p>
              </div>
            ) : promotions.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-slate-600">No promotions found</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Create Your First Promotion
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Promotion</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Details</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {promotions.map((promotion) => (
                      <tr key={promotion.id} className="hover:bg-slate-50/90">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{promotion.name}</div>
                          <div className="text-sm text-slate-600">{promotion.description}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{getTypeText(promotion.type)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-white">
                            {renderPromotionDetails(promotion)}
                          </div>
                          <div className="text-sm text-slate-600">
                            {promotion.products.length} product{promotion.products.length !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {new Date(promotion.startDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-slate-600">
                            to {new Date(promotion.endDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(promotion.isActive)}`}>
                            {getStatusText(promotion.isActive)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(promotion)}
                            className="text-blue-400 hover:text-blue-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(promotion.id)}
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
        </main>
      </div>
    </ProtectedRoute>
  );
}
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  });
