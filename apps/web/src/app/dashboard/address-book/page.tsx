'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressBookSchema, type AddressBookFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import type { AddressBook } from '@fleetos/shared';
import { Plus, Loader2, Pencil, Search, X } from 'lucide-react';

export default function AddressBookPage() {
  const [entries, setEntries] = useState<AddressBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressBookFormData>({
    resolver: zodResolver(addressBookSchema),
  });

  async function fetchEntries(search?: string) {
    setLoading(true);
    let q = supabase.from('address_book').select('*').order('name');

    if (search && search.length >= 3) {
      q = q.ilike('name', `%${search}%`);
    }

    const { data } = await q;
    if (data) setEntries(data as AddressBook[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchEntries();
  }, []);

  // Debounced search — 300ms, 3-char trigger
  useEffect(() => {
    if (searchQuery.length > 0 && searchQuery.length < 3) return;

    const timer = setTimeout(() => {
      fetchEntries(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  function openNew() {
    setEditingId(null);
    reset({ name: '', type: 'consignor', phone: '', email: '', whatsapp: '', gst_number: '', address_line1: '', city: '', state: '', pincode: '' });
    setShowForm(true);
    setServerError('');
  }

  function openEdit(e: AddressBook) {
    setEditingId(e.id);
    reset({
      name: e.name,
      type: e.type,
      phone: e.phone || '',
      email: e.email || '',
      whatsapp: e.whatsapp || '',
      gst_number: e.gst_number || '',
      address_line1: e.address_line1 || '',
      city: e.city || '',
      state: e.state || '',
      pincode: e.pincode || '',
    });
    setShowForm(true);
    setServerError('');
  }

  async function onSubmit(data: AddressBookFormData) {
    setServerError('');

    const payload = {
      name: data.name,
      type: data.type,
      phone: data.phone || null,
      email: data.email || null,
      whatsapp: data.whatsapp || null,
      gst_number: data.gst_number || null,
      address_line1: data.address_line1 || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
    };

    if (editingId) {
      const { error } = await supabase.from('address_book').update(payload).eq('id', editingId);
      if (error) { setServerError(error.message); return; }
    } else {
      const { error } = await supabase.from('address_book').insert(payload);
      if (error) { setServerError(error.message); return; }
    }

    setShowForm(false);
    fetchEntries(searchQuery);
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Address Book</h2>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name (min 3 characters)..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-dark">{editingId ? 'Edit Entry' : 'New Entry'}</h3>
              <button onClick={() => setShowForm(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-text-muted" />
              </button>
            </div>

            {serverError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">Name <span className="text-red-500">*</span></label>
                <input {...register('name')} className={inputCls} />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">Type <span className="text-red-500">*</span></label>
                <select {...register('type')} className={inputCls}>
                  <option value="consignor">Consignor</option>
                  <option value="consignee">Consignee</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-dark">Phone</label>
                  <input {...register('phone')} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-dark">WhatsApp</label>
                  <input {...register('whatsapp')} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">Email</label>
                <input {...register('email')} className={inputCls} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">GST Number</label>
                <input {...register('gst_number')} placeholder="22AAAAA0000A1Z5" className={inputCls} />
                {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-dark">Address</label>
                <input {...register('address_line1')} className={inputCls} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-dark">City</label>
                  <input {...register('city')} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-dark">State</label>
                  <input {...register('state')} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-dark">Pincode</label>
                  <input {...register('pincode')} className={inputCls} />
                  {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode.message}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-text-muted">
            {searchQuery.length >= 3 ? `No results for "${searchQuery}"` : 'No entries in address book.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-text-muted">Type</th>
                <th className="px-4 py-3 font-medium text-text-muted">City</th>
                <th className="px-4 py-3 font-medium text-text-muted">Phone</th>
                <th className="px-4 py-3 font-medium text-text-muted">GST</th>
                <th className="px-4 py-3 font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-text-dark">{e.name}</td>
                  <td className="px-4 py-3 capitalize text-text-muted">{e.type}</td>
                  <td className="px-4 py-3 text-text-muted">{e.city || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{e.phone || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{e.gst_number || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(e)} className="rounded p-1.5 text-text-muted hover:bg-gray-100 hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
