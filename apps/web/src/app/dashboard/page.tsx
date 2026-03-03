'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Truck, FileText, IndianRupee, ShieldAlert, ScrollText, AlertTriangle } from 'lucide-react';

interface KPIData {
  activeTrips: number;
  openLRs: number;
  monthlyRevenue: number;
  complianceAlerts: number;
  ewbExpiring24h: number;
}

function KPISkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
      <div className="mb-2 h-8 w-16 rounded bg-gray-200" />
      <div className="h-3 w-32 rounded bg-gray-100" />
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-text-muted">{title}</span>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-text-dark">{value}</div>
      <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchKPIs() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const nowStr = new Date().toISOString();

    const [tripsRes, lrRes, revenueRes, complianceRes, ewbRes] = await Promise.all([
      supabase
        .from('trips')
        .select('id', { count: 'exact', head: true })
        .in('status', ['planned', 'departed', 'in_transit']),
      supabase
        .from('lr_entries')
        .select('id', { count: 'exact', head: true })
        .in('status', ['booked', 'in_transit']),
      supabase
        .from('lr_entries')
        .select('total_amount')
        .gte('created_at', monthStart),
      supabase
        .from('compliance_documents')
        .select('id', { count: 'exact', head: true })
        .in('status', ['expiring_soon', 'expired']),
      supabase
        .from('lr_entries')
        .select('id', { count: 'exact', head: true })
        .not('ewb_number', 'is', null)
        .not('ewb_expiry', 'is', null)
        .gt('ewb_expiry', nowStr)
        .lte('ewb_expiry', twentyFourHoursFromNow),
    ]);

    const totalRevenue = (revenueRes.data || []).reduce(
      (sum, lr) => sum + (lr.total_amount || 0),
      0
    );

    setKpi({
      activeTrips: tripsRes.count || 0,
      openLRs: lrRes.count || 0,
      monthlyRevenue: totalRevenue,
      complianceAlerts: complianceRes.count || 0,
      ewbExpiring24h: ewbRes.count || 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    fetchKPIs();

    // Realtime subscription on trips table for live updates
    const channel = supabase
      .channel('trips-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => {
          fetchKPIs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  return (
    <div className="p-6">
      <h2 className="mb-6 text-2xl font-bold text-text-dark">Dashboard</h2>

      {/* EWB Expiry Alert Banner */}
      {kpi && kpi.ewbExpiring24h > 0 && (
        <Link
          href="/dashboard/eway-bill?filter=expiring_soon"
          className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {kpi.ewbExpiring24h} E-Way Bill{kpi.ewbExpiring24h > 1 ? 's' : ''} expiring in next 24 hours
            </p>
            <p className="text-xs text-amber-600">Click to view details</p>
          </div>
        </Link>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </>
        ) : kpi ? (
          <>
            <KPICard
              title="Active Trips"
              value={kpi.activeTrips}
              subtitle="Currently in transit"
              icon={Truck}
              color="bg-accent"
            />
            <KPICard
              title="Open LRs"
              value={kpi.openLRs}
              subtitle="Booked & In Transit"
              icon={FileText}
              color="bg-secondary"
            />
            <KPICard
              title="Monthly Revenue"
              value={formatCurrency(kpi.monthlyRevenue)}
              subtitle={`${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`}
              icon={IndianRupee}
              color="bg-success"
            />
            <KPICard
              title="Compliance Alerts"
              value={kpi.complianceAlerts}
              subtitle="Expiring or expired"
              icon={ShieldAlert}
              color={kpi.complianceAlerts > 0 ? 'bg-error' : 'bg-success'}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
