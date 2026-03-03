'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { branchSchema, type BranchFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import type { Branch, User } from '@fleetos/shared';
import { Plus, Loader2, Building2, MapPin, FileText, X } from 'lucide-react';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
  });

  async function fetchData() {
    const [branchRes, managerRes] = await Promise.all([
      supabase.from('branches').select('*').eq('is_active', true).order('name'),
      supabase.from('users').select('*').in('role', ['owner', 'manager']).eq('is_active', true),
    ]);
    if (branchRes.data) setBranches(branchRes.data as Branch[]);
    if (managerRes.data) setManagers(managerRes.data as User[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openNew() {
    setEditingId(null);
    reset({ name: '', address: '', city: '', lr_prefix: '', manager_user_id: '' });
    setShowForm(true);
    setServerError('');
  }

  function openEdit(b: Branch) {
    setEditingId(b.id);
    reset({
      name: b.name,
      address: b.address || '',
      city: b.city || '',
      lr_prefix: b.lr_prefix,
      manager_user_id: b.manager_user_id || '',
    });
    setShowForm(true);
    setServerError('');
  }

  async function onSubmit(data: BranchFormData) {
    setServerError('');

    const payload = {
      name: data.name,
      address: data.address || null,
      city: data.city || null,
      lr_prefix: data.lr_prefix,
      manager_user_id: data.manager_user_id || null,
      is_active: true,
    };

    if (editingId) {
      const { error } = await supabase.from('branches').update(payload).eq('id', editingId);
      if (error) { setServerError(error.message); return; }
    } else {
      const { error } = await supabase.from('branches').insert({ ...payload, lr_current_sequence: 0 });
      if (error) { setServerError(error.message); return; }
    }

    setShowForm(false);
    setEditingId(null);
    fetchData();
  }

  function getManagerName(id: string | null): string {
    if (!id) return 'Unassigned';
    const m = managers.find((u) => u.id === id);
    return m?.name || 'Unknown';
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Branches</h2>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add Branch
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-dark">
                {editingId ? 'Edit Branch' : 'New Branch'}
              </h3>
              <button onClick={() => setShowForm(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-text-muted" />
              </button>
            </div>

            {serverError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">Branch Name <span className="text-red-500">*</span></label>
                <input {...register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">City <span className="text-red-500">*</span></label>
                <input {...register('city')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">Address</label>
                <input {...register('address')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">LR Prefix <span className="text-red-500">*</span></label>
                <input {...register('lr_prefix')} placeholder="VZG" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                {errors.lr_prefix && <p className="mt-1 text-xs text-red-600">{errors.lr_prefix.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">Branch Manager</label>
                <select {...register('manager_user_id')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">No manager assigned</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-text-muted">No branches yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => openEdit(b)}
              className="rounded-xl border border-gray-200 bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-text-dark">{b.name}</h3>
              </div>

              <div className="space-y-1.5 text-sm text-text-muted">
                {b.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {b.city}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  LR Prefix: <span className="font-mono font-medium text-text-dark">{b.lr_prefix}</span>
                  &nbsp;| Seq: {b.lr_current_sequence}
                </div>
                <div className="text-xs">
                  Manager: {getManagerName(b.manager_user_id)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
