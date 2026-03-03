'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { computeComplianceStatus, daysUntilExpiry } from '@fleetos/shared';
import type { ComplianceStatus, DocType } from '@fleetos/shared';
import { Plus, Loader2, Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

type ComplianceItem = {
  id: string;
  entity_type: 'vehicle' | 'driver';
  entity_id: string;
  doc_type: DocType;
  doc_number: string | null;
  expiry_date: string;
  status: ComplianceStatus;
  renewal_status: 'none' | 'in_progress' | 'renewed';
  document_url: string | null;
  entity_name: string; // populated from join
};

type Filter = 'all' | 'vehicles' | 'drivers' | 'expired' | 'expiring_soon';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  insurance: 'Insurance',
  puc: 'PUC',
  fitness: 'Fitness Certificate',
  national_permit: 'National Permit',
  state_permit: 'State Permit',
  driver_licence: 'Driver Licence',
};

const STATUS_CONFIG: Record<ComplianceStatus, { bg: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  valid: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2, label: 'Valid' },
  expiring_soon: { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertTriangle, label: 'Expiring Soon' },
  expired: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Expired' },
};

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Vehicles', value: 'vehicles' },
  { label: 'Drivers', value: 'drivers' },
  { label: 'Expired', value: 'expired' },
  { label: 'Expiring Soon', value: 'expiring_soon' },
];

export default function ComplianceDashboardPage() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchDocs = useCallback(async () => {
    setLoading(true);

    const { data: docs } = await supabase
      .from('compliance_documents')
      .select('*')
      .order('expiry_date', { ascending: true });

    if (!docs) {
      setLoading(false);
      return;
    }

    // Fetch entity names
    const vehicleIds = [...new Set(docs.filter((d) => d.entity_type === 'vehicle').map((d) => d.entity_id))];
    const driverIds = [...new Set(docs.filter((d) => d.entity_type === 'driver').map((d) => d.entity_id))];

    const [vehicleRes, driverRes] = await Promise.all([
      vehicleIds.length > 0
        ? supabase.from('vehicles').select('id, registration_number').in('id', vehicleIds)
        : { data: [] },
      driverIds.length > 0
        ? supabase.from('drivers').select('id, name').in('id', driverIds)
        : { data: [] },
    ]);

    const vehicleMap = new Map((vehicleRes.data ?? []).map((v: { id: string; registration_number: string }) => [v.id, v.registration_number]));
    const driverMap = new Map((driverRes.data ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));

    const enriched: ComplianceItem[] = docs.map((doc) => ({
      ...doc,
      status: computeComplianceStatus(doc.expiry_date),
      entity_name:
        doc.entity_type === 'vehicle'
          ? vehicleMap.get(doc.entity_id) ?? 'Unknown Vehicle'
          : driverMap.get(doc.entity_id) ?? 'Unknown Driver',
    }));

    setItems(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  async function markRenewalInProgress(docId: string) {
    await supabase
      .from('compliance_documents')
      .update({ renewal_status: 'in_progress' })
      .eq('id', docId);
    fetchDocs();
  }

  const filtered = items.filter((item) => {
    if (filter === 'vehicles') return item.entity_type === 'vehicle';
    if (filter === 'drivers') return item.entity_type === 'driver';
    if (filter === 'expired') return item.status === 'expired';
    if (filter === 'expiring_soon') return item.status === 'expiring_soon';
    return true;
  });

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const expiringCount = items.filter((i) => i.status === 'expiring_soon').length;
  const validCount = items.filter((i) => i.status === 'valid').length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Compliance</h2>
        <Link
          href="/dashboard/compliance/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add Document
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold text-green-700">{validCount}</p>
            <p className="text-sm text-green-600">Valid</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
          <div>
            <p className="text-2xl font-bold text-amber-700">{expiringCount}</p>
            <p className="text-sm text-amber-600">Expiring Soon</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <XCircle className="h-8 w-8 text-red-600" />
          <div>
            <p className="text-2xl font-bold text-red-700">{expiredCount}</p>
            <p className="text-sm text-red-600">Expired</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value ? 'bg-primary text-white' : 'text-text-muted hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Shield className="mx-auto mb-3 h-12 w-12 text-text-muted" />
          <p className="text-text-muted">No compliance documents found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Entity</th>
                <th className="px-4 py-3 font-medium text-text-muted">Document</th>
                <th className="px-4 py-3 font-medium text-text-muted">Doc Number</th>
                <th className="px-4 py-3 font-medium text-text-muted">Expiry Date</th>
                <th className="px-4 py-3 font-medium text-text-muted">Days Left</th>
                <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-text-muted">Renewal</th>
                <th className="px-4 py-3 font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const days = daysUntilExpiry(item.expiry_date);
                const cfg = STATUS_CONFIG[item.status];
                const Icon = cfg.icon;
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-dark">{item.entity_name}</div>
                      <div className="text-xs text-text-muted capitalize">{item.entity_type}</div>
                    </td>
                    <td className="px-4 py-3 text-text-dark">{DOC_TYPE_LABELS[item.doc_type]}</td>
                    <td className="px-4 py-3 text-text-muted font-mono text-xs">{item.doc_number ?? '—'}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {new Date(item.expiry_date).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${days <= 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                        {days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.renewal_status === 'in_progress' && (
                        <span className="text-xs text-blue-600 font-medium">In Progress</span>
                      )}
                      {item.renewal_status === 'renewed' && (
                        <span className="text-xs text-green-600 font-medium">Renewed</span>
                      )}
                      {item.renewal_status === 'none' && item.status !== 'valid' && (
                        <button
                          onClick={() => markRenewalInProgress(item.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          Start Renewal
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/compliance/new?edit=${item.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
