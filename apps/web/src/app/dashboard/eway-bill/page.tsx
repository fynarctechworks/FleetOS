'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { LREntry } from '@fleetos/shared';
import { FileText, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';

type EWBStatus = 'valid' | 'expiring_soon' | 'expired' | 'all';

function getEWBStatus(expiryStr: string): 'valid' | 'expiring_soon' | 'expired' {
  const expiry = new Date(expiryStr);
  const now = new Date();
  const hoursLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursLeft <= 0) return 'expired';
  if (hoursLeft <= 24) return 'expiring_soon';
  return 'valid';
}

function getStatusBadge(status: 'valid' | 'expiring_soon' | 'expired') {
  switch (status) {
    case 'valid':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle className="h-3 w-3" /> Valid
        </span>
      );
    case 'expiring_soon':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          <Clock className="h-3 w-3" /> Expiring Soon
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          <XCircle className="h-3 w-3" /> Expired
        </span>
      );
  }
}

function timeLeft(expiryStr: string): string {
  const diff = new Date(expiryStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  return `${hours}h ${mins}m left`;
}

export default function EWayBillPage() {
  const { appUser } = useAuthStore();
  const [lrs, setLrs] = useState<LREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EWBStatus>('all');

  const fetchEWBs = useCallback(async () => {
    if (!appUser?.company_id) return;
    setLoading(true);

    const { data } = await supabase
      .from('lr_entries')
      .select('*')
      .eq('company_id', appUser.company_id)
      .not('ewb_number', 'is', null)
      .not('ewb_number', 'eq', '')
      .order('ewb_expiry', { ascending: true });

    setLrs((data as LREntry[]) ?? []);
    setLoading(false);
  }, [appUser?.company_id]);

  useEffect(() => {
    fetchEWBs();
  }, [fetchEWBs]);

  const filtered = lrs.filter((lr) => {
    if (filter === 'all') return true;
    if (!lr.ewb_expiry) return false;
    return getEWBStatus(lr.ewb_expiry) === filter;
  });

  const expiringSoon = lrs.filter((lr) => lr.ewb_expiry && getEWBStatus(lr.ewb_expiry) === 'expiring_soon').length;
  const expired = lrs.filter((lr) => lr.ewb_expiry && getEWBStatus(lr.ewb_expiry) === 'expired').length;
  const valid = lrs.filter((lr) => lr.ewb_expiry && getEWBStatus(lr.ewb_expiry) === 'valid').length;

  const tabs: { key: EWBStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: lrs.length },
    { key: 'expiring_soon', label: 'Expiring', count: expiringSoon },
    { key: 'expired', label: 'Expired', count: expired },
    { key: 'valid', label: 'Valid', count: valid },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">E-Way Bills</h2>
        <Link
          href="/dashboard/lr/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          + New LR with EWB
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">Total EWBs</p>
          <p className="mt-1 text-xl font-bold text-text-dark">{lrs.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">Valid</p>
          <p className="mt-1 text-xl font-bold text-green-600">{valid}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-medium uppercase text-amber-700">Expiring (&lt;24h)</p>
          </div>
          <p className="mt-1 text-xl font-bold text-amber-600">{expiringSoon}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium uppercase text-red-700">Expired</p>
          <p className="mt-1 text-xl font-bold text-red-600">{expired}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === tab.key
                ? 'bg-primary text-white'
                : 'bg-white text-text-muted border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-text-muted">
                <th className="px-6 py-3">EWB Number</th>
                <th className="px-6 py-3">LR Number</th>
                <th className="px-6 py-3">Route</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Expiry</th>
                <th className="px-6 py-3">Time Left</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lr) => {
                const status = lr.ewb_expiry ? getEWBStatus(lr.ewb_expiry) : 'valid';
                return (
                  <tr key={lr.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/lr/${lr.id}`}
                        className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {lr.ewb_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-text-dark">{lr.lr_number}</td>
                    <td className="px-6 py-3 text-text-muted">
                      {lr.origin_city} → {lr.destination_city}
                    </td>
                    <td className="px-6 py-3">{getStatusBadge(status)}</td>
                    <td className="px-6 py-3 text-text-muted">
                      {lr.ewb_expiry
                        ? new Date(lr.ewb_expiry).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-3">
                      {lr.ewb_expiry ? (
                        <span
                          className={`text-xs font-medium ${
                            status === 'expired'
                              ? 'text-red-600'
                              : status === 'expiring_soon'
                              ? 'text-amber-600'
                              : 'text-green-600'
                          }`}
                        >
                          {timeLeft(lr.ewb_expiry)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    {loading ? 'Loading…' : 'No E-Way Bills found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
