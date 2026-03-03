import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';

interface KPIData {
  activeTrips: number;
  openLRs: number;
  monthlyRevenue: number;
  complianceAlerts: number;
}

function KPICard({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function KPISkeleton() {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: '#E2E8F0' }]}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: 60, height: 28, marginTop: 8 }]} />
    </View>
  );
}

export default function HomeScreen() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchKPIs = useCallback(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [tripsRes, lrRes, revenueRes, complianceRes] = await Promise.all([
      supabase.from('trips').select('id', { count: 'exact', head: true }).in('status', ['planned', 'departed', 'in_transit']),
      supabase.from('lr_entries').select('id', { count: 'exact', head: true }).in('status', ['booked', 'in_transit']),
      supabase.from('lr_entries').select('total_amount').gte('created_at', monthStart),
      supabase.from('compliance_documents').select('id', { count: 'exact', head: true }).in('status', ['expiring_soon', 'expired']),
    ]);

    const totalRevenue = (revenueRes.data || []).reduce((sum, lr) => sum + (lr.total_amount || 0), 0);

    setKpi({
      activeTrips: tripsRes.count || 0,
      openLRs: lrRes.count || 0,
      monthlyRevenue: totalRevenue,
      complianceAlerts: complianceRes.count || 0,
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchKPIs();

    const channel = supabase
      .channel('mobile-trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchKPIs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchKPIs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchKPIs();
  }, [fetchKPIs]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3C6E" />}
    >
      <Text style={styles.heading}>Dashboard</Text>

      {loading ? (
        <View style={styles.grid}>
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
        </View>
      ) : kpi ? (
        <View style={styles.grid}>
          <KPICard title="Active Trips" value={kpi.activeTrips} color="#F97316" />
          <KPICard title="Open LRs" value={kpi.openLRs} color="#0EA5E9" />
          <KPICard title="Monthly Revenue" value={formatCurrency(kpi.monthlyRevenue)} color="#16A34A" />
          <KPICard title="Compliance Alerts" value={kpi.complianceAlerts} color={kpi.complianceAlerts > 0 ? '#DC2626' : '#16A34A'} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  grid: { gap: 12 },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  kpiTitle: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  kpiValue: { fontSize: 28, fontWeight: 'bold', color: '#1E293B', marginTop: 4 },
  skeletonLine: { width: 100, height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 },
});
