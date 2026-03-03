import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/lib/supabase';
import type { DriverSalaryEntry, SalaryStatus } from '@fleetos/shared';
import { formatSalaryMonth, getCurrentMonth } from '@fleetos/shared';

type SalaryWithDriver = DriverSalaryEntry & {
  driver: { name: string; phone: string } | null;
};

const STATUS_COLORS: Record<SalaryStatus, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#374151' },
  approved: { bg: '#DBEAFE', text: '#1D4ED8' },
  paid: { bg: '#D1FAE5', text: '#059669' },
};

export default function SalaryScreen() {
  const [entries, setEntries] = useState<SalaryWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [month] = useState(getCurrentMonth());

  const fetchSalaries = useCallback(async () => {
    const { data } = await supabase
      .from('driver_salary_entries')
      .select('*, driver:driver_id(name, phone)')
      .eq('month', month)
      .order('created_at', { ascending: false });
    setEntries((data as SalaryWithDriver[]) ?? []);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  const totalNet = entries.reduce((sum, e) => sum + e.net_salary, 0);
  const paidCount = entries.filter((e) => e.status === 'paid').length;

  const renderItem = ({ item }: { item: SalaryWithDriver }) => {
    const colors = STATUS_COLORS[item.status];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.driverName}>{item.driver?.name ?? '—'}</Text>
            <Text style={styles.driverPhone}>{item.driver?.phone}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Fixed Pay</Text>
            <Text style={styles.breakdownValue}>₹{item.fixed_pay.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Allowances</Text>
            <Text style={[styles.breakdownValue, { color: '#16A34A' }]}>
              +₹{item.trip_allowances.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Deductions</Text>
            <Text style={[styles.breakdownValue, { color: '#DC2626' }]}>
              -₹{(item.advances_deducted + item.other_deductions).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net Salary</Text>
          <Text style={styles.netValue}>₹{item.net_salary.toLocaleString('en-IN')}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryMonth}>{formatSalaryMonth(month)}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Payout</Text>
            <Text style={styles.summaryValue}>₹{totalNet.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
              {paidCount}/{entries.length}
            </Text>
          </View>
        </View>
      </View>

      <FlashList
        data={entries}
        renderItem={renderItem}
        estimatedItemSize={160}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); fetchSalaries(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No salary entries for this month</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  summaryBar: { padding: 16, backgroundColor: '#1A3C6E' },
  summaryMonth: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12,
  },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#FFF', marginTop: 4 },
  card: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  driverPhone: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  breakdown: {
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  breakdownLabel: { fontSize: 13, color: '#64748B' },
  breakdownValue: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
  netRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 8,
  },
  netLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  netValue: { fontSize: 18, fontWeight: '700', color: '#1A3C6E' },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#64748B' },
});
