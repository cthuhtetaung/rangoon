'use client';

import { useEffect, useState, type FormEvent } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { FEATURE_PERMISSIONS, type FeaturePermission } from '@/lib/accessControl';

type UserAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  shopName?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  role: string;
  isActive: boolean;
  extraPermissions?: string[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ROLE_OPTIONS = ['admin', 'owner', 'manager', 'cashier', 'waiter', 'chef', 'staff'];

function getRoleOptionsByUserRole(currentRole?: string): string[] {
  const role = (currentRole || '').toLowerCase();
  if (role === 'owner') {
    return ROLE_OPTIONS.filter((item) => item !== 'admin');
  }
  return ROLE_OPTIONS;
}

export default function StaffPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'staff',
    password: '',
    shopName: '',
    businessPhone: '',
    businessAddress: '',
    extraPermissions: [] as FeaturePermission[],
  });
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'waiter',
    shopName: '',
    businessPhone: '',
    businessAddress: '',
  });

  const currentUserRole = (user?.role || '').toLowerCase();
  const canManageRoles = currentUserRole === 'admin' || currentUserRole === 'owner';
  const roleOptions = getRoleOptionsByUserRole(currentUserRole);

  const fetchUsers = async () => {
    if (!canManageRoles) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/users`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data);
      const nextDrafts: Record<string, string> = {};
      data.forEach((account: UserAccount) => {
        nextDrafts[account.id] = account.role;
      });
      setDraftRoles(nextDrafts);
      setError('');
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [canManageRoles]);

  const updateRole = async (account: UserAccount) => {
    const nextRole = draftRoles[account.id];
    if (!nextRole || nextRole === account.role) {
      return;
    }

    try {
      setSavingUserId(account.id);
      const response = await fetch(`${API_URL}/users/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: nextRole }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update role');
      }

      setUsers((prev) => prev.map((item) => (item.id === account.id ? { ...item, role: nextRole } : item)));
      setError('');
    } catch (updateError: any) {
      setError(updateError.message || 'Failed to update role');
    } finally {
      setSavingUserId(null);
    }
  };

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create user');
      }

      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        role: 'waiter',
        shopName: '',
        businessPhone: '',
        businessAddress: '',
      });
      await fetchUsers();
      setError('');
    } catch (createError: any) {
      setError(createError.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const startEditUser = (account: UserAccount) => {
    setEditingUserId(account.id);
    setEditUser({
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      phone: account.phone || '',
      role: account.role,
      password: '',
      shopName: account.shopName || '',
      businessPhone: account.businessPhone || '',
      businessAddress: account.businessAddress || '',
      extraPermissions: (account.extraPermissions || []) as FeaturePermission[],
    });
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditUser({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'staff',
      password: '',
      shopName: '',
      businessPhone: '',
      businessAddress: '',
      extraPermissions: [] as FeaturePermission[],
    });
  };

  const saveEditUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    try {
      setEditLoading(true);
      const payload: any = {
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        email: editUser.email,
        phone: editUser.phone,
        role: editUser.role,
        shopName: editUser.shopName || undefined,
        businessPhone: editUser.businessPhone || undefined,
        businessAddress: editUser.businessAddress || undefined,
        extraPermissions: editUser.extraPermissions || [],
      };
      if (editUser.password.trim()) {
        payload.password = editUser.password.trim();
      }

      const response = await fetch(`${API_URL}/users/${editingUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update user');
      }

      await fetchUsers();
      cancelEditUser();
      setError('');
    } catch (updateError: any) {
      setError(updateError.message || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const deleteUser = async (account: UserAccount) => {
    if (account.id === user?.id) {
      setError('You cannot delete your own admin account.');
      return;
    }

    if (!window.confirm(`Delete user "${account.email}"?`)) {
      return;
    }

    try {
      setDeleteLoadingId(account.id);
      const response = await fetch(`${API_URL}/users/${account.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete user');
      }

      await fetchUsers();
      setError('');
    } catch (deleteError: any) {
      setError(deleteError.message || 'Failed to delete user');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="cm-shell py-8">
        <div className="mb-6">
          <span className="cm-kicker">Staff Access Control</span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Staff & Roles</h1>
          <p className="mt-2 text-sm text-slate-600">
            Assign system access roles for cashier, waiter, and chef accounts.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!canManageRoles ? (
          <div className="cm-panel p-6 text-sm text-slate-600">
            Only admin or owner can manage staff role assignments.
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={createUser} className="cm-panel p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Create User Account</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={newUser.firstName}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  placeholder="First name"
                  required
                />
                <input
                  value={newUser.lastName}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  placeholder="Last name"
                  required
                />
                <input
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  placeholder="Username or email"
                  required
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  placeholder="Password (min 6)"
                  minLength={6}
                  required
                />
                <input
                  value={newUser.phone}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  placeholder="Phone"
                  required
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.toUpperCase()}
                    </option>
                  ))}
                </select>
                {newUser.role === 'owner' && (
                  <>
                    <input
                      value={newUser.shopName}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, shopName: e.target.value }))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                      placeholder="Shop name (required for invoice header)"
                      required
                    />
                    <input
                      value={newUser.businessPhone}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, businessPhone: e.target.value }))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                      placeholder="Shop phone"
                    />
                    <input
                      value={newUser.businessAddress}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, businessAddress: e.target.value }))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 md:col-span-2"
                      placeholder="Shop address (optional)"
                    />
                  </>
                )}
              </div>
              <button
                type="submit"
                disabled={createLoading}
                className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {createLoading ? 'Creating...' : 'Create user'}
              </button>
            </form>

            <div className="cm-panel overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-slate-600">Loading user accounts...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Extra Access</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((account) => (
                      <tr key={account.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-900">{account.firstName} {account.lastName}</td>
                        <td className="px-4 py-3 text-slate-700">{account.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={draftRoles[account.id] || account.role}
                            onChange={(e) =>
                              setDraftRoles((prev) => ({
                                ...prev,
                                [account.id]: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800"
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              account.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {(account.extraPermissions || []).length > 0 ? (account.extraPermissions || []).join(', ') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateRole(account)}
                              disabled={savingUserId === account.id || (draftRoles[account.id] || account.role) === account.role}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingUserId === account.id ? 'Saving...' : 'Save role'}
                            </button>
                            <button
                              onClick={() => startEditUser(account)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteUser(account)}
                              disabled={deleteLoadingId === account.id || account.id === user?.id}
                              className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deleteLoadingId === account.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
            <Modal
              open={Boolean(editingUserId)}
              title="Edit User"
              onClose={cancelEditUser}
            >
              <form onSubmit={saveEditUser}>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={editUser.firstName}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    placeholder="First name"
                    required
                  />
                  <input
                    value={editUser.lastName}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    placeholder="Last name"
                    required
                  />
                  <input
                    value={editUser.email}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, email: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    placeholder="Username or email"
                    required
                  />
                  <input
                    value={editUser.phone}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, phone: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    placeholder="Phone"
                  />
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, role: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  {editUser.role === 'owner' && (
                    <>
                      <input
                        value={editUser.shopName}
                        onChange={(e) => setEditUser((prev) => ({ ...prev, shopName: e.target.value }))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                        placeholder="Shop name (required)"
                        required
                      />
                      <input
                        value={editUser.businessPhone}
                        onChange={(e) => setEditUser((prev) => ({ ...prev, businessPhone: e.target.value }))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                        placeholder="Shop phone"
                      />
                      <input
                        value={editUser.businessAddress}
                        onChange={(e) => setEditUser((prev) => ({ ...prev, businessAddress: e.target.value }))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 md:col-span-2"
                        placeholder="Shop address (optional)"
                      />
                    </>
                  )}
                  <input
                    type="password"
                    value={editUser.password}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, password: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    placeholder="New password (optional)"
                    minLength={6}
                  />
                  <div className="md:col-span-2">
                    <p className="mb-2 text-xs font-semibold text-slate-700">Extra Access (Manual)</p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {FEATURE_PERMISSIONS.map((permission) => {
                        const checked = editUser.extraPermissions.includes(permission);
                        return (
                          <label
                            key={permission}
                            className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(editUser.extraPermissions);
                                if (e.target.checked) next.add(permission);
                                else next.delete(permission);
                                setEditUser((prev) => ({
                                  ...prev,
                                  extraPermissions: Array.from(next) as FeaturePermission[],
                                }));
                              }}
                            />
                            {permission}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {editLoading ? 'Saving...' : 'Save user'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditUser}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
