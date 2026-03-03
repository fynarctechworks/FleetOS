'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { LRStatus } from '@fleetos/shared';
import { Plus, Loader2, Eye } from 'lucide-react';

type LRListItem = {
  id: string;
  lr_number: string;
  status: LRStatus;
  load_type: string;
  origin_city: string;
  destination_city: string;
  freight_amount: number;
  total_amount: number;
  created_at: string;
  consignor: { name: string } | null;
  consignee: { name: string } | null;
};

const STATUS_TABS: { label: string; value: LRStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Booked', value: 'booked' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Billed', value: 'billed' },
  { label: 'Payment Received', value: 'payment_received' },
];

const STATUS_BADGE: Record<LRStatus, string> = {
  booked: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-amber-100 text-amber-800',
  delivered: 'bg-green-100 text-green-800',
  pod_uploaded: 'bg-teal-100 text-teal-800',
  billed: 'bg-purple-100 text-purple-800',
  payment_received: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABEL: Record<LRStatus, string> = {
  booked: 'Booked',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  pod_uploaded: 'POD Uploaded',
  billed: 'Billed',
  payment_received: 'Paid',
};

export default function LRListPage() {
  const [lrs, setLrs] = useState<LRListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LRStatus | 'all'>('all');

  async function fetchLRs(status: LRStatus | 'all') {
    setLoading(true);

    let query = supabase
      .from('lr_entries')
      .select(
        `id, lr_number, status, load_type, origin_city, destination_city,
         freight_amount, total_amount, created_at,
         consignor:consignor_id(name),
         consignee:consignee_id(name)`
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (!error && data) {
      setLrs(data as unknown as LRListItem[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLRs(activeTab);
  }, [activeTab]);

  function handleTabChange(tab: LRStatus | 'all') {
    setActiveTab(tab);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">LR / Bilty</h2>
        <Link
          href="/dashboard/lr/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Create LR
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-primary text-white'
                : 'text-text-muted hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : lrs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-text-muted">
            {activeTab === 'all' ? 'No LRs created yet.' : `No LRs with status "${activeTab}".`}
          </p>
          <Link
            href="/dashboard/lr/new"
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Create your first LR
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">LR Number</th>
                <th className="px-4 py-3 font-medium text-text-muted">Consignor → Consignee</th>
                <th className="px-4 py-3 font-medium text-text-muted">Route</th>
                <th className="px-4 py-3 font-medium text-text-muted">Type</th>
                <th className="px-4 py-3 font-medium text-text-muted">Amount</th>
                <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-text-muted">Date</th>
                <th className="px-4 py-3 font-medium text-text-muted">View</th>
              </tr>
            </thead>
            <tbody>
              {lrs.map((lr) => (
                <tr key={lr.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-primary">{lr.lr_number}</td>
                  <td className="max-w-[200px] px-4 py-3">
                    <div className="truncate text-text-dark">{lr.consignor?.name ?? '—'}</div>
                    <div className="truncate text-xs text-text-muted">→ {lr.consignee?.name ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {lr.origin_city} → {lr.destination_city}
                  </td>
                  <td className="px-4 py-3 uppercase text-xs text-text-muted">{lr.load_type}</td>
                  <td className="px-4 py-3 font-medium text-text-dark">
                    ₹{lr.total_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[lr.status]
                      }`}
                    >
                      {STATUS_LABEL[lr.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(lr.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/lr/${lr.id}`}
                      className="rounded p-1.5 text-text-muted hover:bg-gray-100 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
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
