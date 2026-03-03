'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Driver } from '@fleetos/shared';
import { Plus, Loader2, Pencil, Phone } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (data) setDrivers(data as Driver[]);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Drivers</h2>
        <Link
          href="/dashboard/drivers/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add Driver
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-text-muted">No drivers added yet.</p>
          <Link href="/dashboard/drivers/new" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
            Add your first driver
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-text-muted">Phone</th>
                <th className="px-4 py-3 font-medium text-text-muted">Licence</th>
                <th className="px-4 py-3 font-medium text-text-muted">Aadhaar (last 4)</th>
                <th className="px-4 py-3 font-medium text-text-muted">Salary</th>
                <th className="px-4 py-3 font-medium text-text-muted">Score</th>
                <th className="px-4 py-3 font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-text-dark">{d.name}</td>
                  <td className="px-4 py-3 text-text-muted">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {d.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{d.licence_number || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {d.aadhaar_last4 ? `XXXX-XXXX-${d.aadhaar_last4}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {d.fixed_salary > 0 ? `₹${d.fixed_salary.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      d.performance_score >= 80
                        ? 'bg-green-100 text-green-800'
                        : d.performance_score >= 50
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {d.performance_score}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/drivers/${d.id}`} className="rounded p-1.5 text-text-muted hover:bg-gray-100 hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </Link>
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
