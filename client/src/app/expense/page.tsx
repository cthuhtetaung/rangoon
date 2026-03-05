'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

type Expense = {
  id: string;
  title: string;
  description?: string;
  amount: number;
  expenseDate: string;
  categoryId?: string;
  branchId: string;
  category?: { id: string; name: string };
  branch?: { id: string; name: string };
};

type ExpenseCategory = {
  id: string;
  name: string;
};

type Branch = {
  id: string;
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ExpensePage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [error, setError] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 16),
    categoryId: '',
    branchId: '',
  });

  const totalExpense = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses],
  );

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [expenseRes, categoryRes, branchRes] = await Promise.all([
        fetch(`${API_URL}/expenses`, { credentials: 'include', headers: authHeaders() }),
        fetch(`${API_URL}/expense-categories`, { credentials: 'include', headers: authHeaders() }),
        fetch(`${API_URL}/branches`, { credentials: 'include', headers: authHeaders() }),
      ]);

      if (!expenseRes.ok) {
        throw new Error('Failed to load expenses');
      }

      const expensesData = await expenseRes.json();
      setExpenses(expensesData);

      if (categoryRes.ok) {
        const categoryData = await categoryRes.json();
        setCategories(categoryData);
      }

      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(branchData);
        setFormData((prev) => ({
          ...prev,
          branchId: prev.branchId || user?.branchId || branchData[0]?.id || '',
        }));
      }
      setError('');
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user?.id]);

  const handleCreateExpense = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.branchId) {
      setError('Please select branch');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        amount: Number(formData.amount),
        expenseDate: new Date(formData.expenseDate).toISOString(),
        categoryId: formData.categoryId || undefined,
        branchId: formData.branchId,
      };

      const response = await fetch(`${API_URL}/expenses`, {
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
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to create expense');
      }

      setFormData((prev) => ({
        ...prev,
        title: '',
        description: '',
        amount: '',
        categoryId: '',
      }));
      await loadData();
    } catch (createError: any) {
      setError(createError.message || 'Failed to create expense');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryDraft.trim()) return;

    try {
      setSavingCategory(true);
      const response = await fetch(`${API_URL}/expense-categories`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: categoryDraft.trim(),
          isActive: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to create category');
      }

      setCategoryDraft('');
      await loadData();
      setError('');
    } catch (createError: any) {
      setError(createError.message || 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-6">
          <span className="cm-kicker">Expense Tracking</span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Expense Management</h1>
          <p className="mt-2 text-sm text-slate-600">Add and review operating expenses.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="cm-panel p-4">
            <p className="text-sm text-slate-600">Total Expenses</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalExpense.toLocaleString()} MMK</p>
          </div>
          <div className="cm-panel p-4">
            <p className="text-sm text-slate-600">Expense Records</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{expenses.length}</p>
          </div>
          <div className="cm-panel p-4">
            <p className="text-sm text-slate-600">Categories</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{categories.length}</p>
          </div>
        </div>

        <div className="cm-panel mb-6 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Add Expense</h2>
          <form onSubmit={handleCreateExpense} className="grid gap-3 md:grid-cols-2">
            <input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              placeholder="Expense title"
              required
            />
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              placeholder="Amount (MMK)"
              min="0"
              required
            />
            <input
              type="datetime-local"
              value={formData.expenseDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, expenseDate: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              required
            />
            {branches.length <= 1 ? (
              <div>
                <input
                  value={branches[0]?.name || 'Main Branch'}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700"
                  readOnly
                />
                <p className="mt-1 text-xs text-slate-500">Single-branch mode: expense auto-linked to this branch.</p>
              </div>
            ) : (
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
            )}
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              placeholder="Description (optional)"
            />
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Add expense'}
              </button>
            </div>
          </form>
        </div>

        <div className="cm-panel mb-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Expense Categories</h2>
            <span className="text-sm font-medium text-slate-600">{categories.length} categories</span>
          </div>
          <form onSubmit={handleCreateCategory} className="mb-4 flex flex-wrap gap-2">
            <input
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
              className="min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              placeholder="New category name (e.g. Utilities, Rent, Salary)"
            />
            <button
              type="submit"
              disabled={savingCategory}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {savingCategory ? 'Adding...' : 'Add category'}
            </button>
          </form>
          {categories.length === 0 ? (
            <p className="text-sm text-slate-600">No category yet. Create categories to organize expense reports.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {category.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="cm-panel p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Expenses</h2>
          {loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-slate-600">No expenses yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {expenses.map((expense) => (
                  <div key={expense.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{expense.title}</p>
                        <p className="text-xs text-slate-600">{new Date(expense.expenseDate).toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{Number(expense.amount).toLocaleString()} MMK</p>
                    </div>
                    <div className="mt-2 text-xs text-slate-700">
                      <p><span className="font-semibold">Category:</span> {expense.category?.name || '-'}</p>
                      <p><span className="font-semibold">Branch:</span> {expense.branch?.name || '-'}</p>
                      {expense.description && <p><span className="font-semibold">Note:</span> {expense.description}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 text-left text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Branch</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-900">
                          <div>{expense.title}</div>
                          {expense.description && <div className="text-xs text-slate-500">{expense.description}</div>}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{expense.category?.name || '-'}</td>
                        <td className="px-3 py-2 text-slate-700">{expense.branch?.name || '-'}</td>
                        <td className="px-3 py-2 text-slate-700">{new Date(expense.expenseDate).toLocaleString()}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{Number(expense.amount).toLocaleString()} MMK</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
