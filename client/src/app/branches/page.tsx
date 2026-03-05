'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  isHeadquarters: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    isActive: true,
  });

  // Mock data for demonstration
  useEffect(() => {
    const mockBranches: Branch[] = [
      { 
        id: '1', 
        name: 'Main Branch', 
        address: 'No. 123, Main Street, Yangon', 
        phone: '+95 9 1234 5678', 
        isActive: true, 
        isHeadquarters: true,
        createdAt: '2023-01-15T10:30:00Z',
        updatedAt: '2023-01-15T10:30:00Z'
      },
      { 
        id: '2', 
        name: 'North Branch', 
        address: 'No. 456, North Road, Mandalay', 
        phone: '+95 9 2345 6789', 
        isActive: true, 
        isHeadquarters: false,
        createdAt: '2023-02-20T14:45:00Z',
        updatedAt: '2023-02-20T14:45:00Z'
      },
      { 
        id: '3', 
        name: 'South Branch', 
        address: 'No. 789, South Avenue, Naypyidaw', 
        phone: '+95 9 3456 7890', 
        isActive: false, 
        isHeadquarters: false,
        createdAt: '2023-03-10T09:15:00Z',
        updatedAt: '2023-03-10T09:15:00Z'
      },
    ];

    setBranches(mockBranches);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBranch) {
      // Update existing branch
      setBranches(branches.map(branch => 
        branch.id === editingBranch.id 
          ? { ...branch, ...formData, updatedAt: new Date().toISOString() } 
          : branch
      ));
      setEditingBranch(null);
    } else {
      // Add new branch
      const newBranch: Branch = {
        id: `${branches.length + 1}`,
        ...formData,
        isHeadquarters: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setBranches([...branches, newBranch]);
    }
    
    // Reset form
    setFormData({
      name: '',
      address: '',
      phone: '',
      isActive: true,
    });
    setShowAddForm(false);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      setBranches(branches.filter(branch => branch.id !== id));
    }
  };

  const setHeadquarters = (id: string) => {
    setBranches(branches.map(branch => ({
      ...branch,
      isHeadquarters: branch.id === id
    })));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100">
        
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Branch Management</h1>
            <p className="text-slate-600">Manage your business locations and branches</p>
          </div>
          
          <div className="bg-white/85 rounded-xl p-6 border border-slate-200 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Branches</h2>
              <button 
                onClick={() => {
                  setEditingBranch(null);
                  setFormData({
                    name: '',
                    address: '',
                    phone: '',
                    isActive: true,
                  });
                  setShowAddForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition"
              >
                Add New Branch
              </button>
            </div>
            
            {showAddForm && (
              <div className="mb-6 bg-slate-50/90 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </h3>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Branch Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Enter branch name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Enter phone number"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Address *
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Enter full address"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded bg-white"
                      />
                      <label className="ml-2 block text-sm text-slate-600">
                        Active Branch
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition"
                    >
                      {editingBranch ? 'Update Branch' : 'Add Branch'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingBranch(null);
                      }}
                      className="bg-slate-600 hover:bg-white text-white py-2 px-6 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {branches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-slate-50/90">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{branch.name}</div>
                        {branch.isHeadquarters && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 mt-1">
                            Headquarters
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                        {branch.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {branch.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          branch.isActive 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(branch)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                          {!branch.isHeadquarters && branch.isActive && (
                            <button
                              onClick={() => setHeadquarters(branch.id)}
                              className="text-purple-400 hover:text-purple-300"
                            >
                              Set HQ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-white/85 rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-white mb-4">Branch Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50/90 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{branches.length}</div>
                <div className="text-slate-600">Total Branches</div>
              </div>
              <div className="bg-slate-50/90 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-400">
                  {branches.filter(b => b.isActive).length}
                </div>
                <div className="text-slate-600">Active Branches</div>
              </div>
              <div className="bg-slate-50/90 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-400">
                  {branches.filter(b => b.isHeadquarters).length}
                </div>
                <div className="text-slate-600">Headquarters</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}