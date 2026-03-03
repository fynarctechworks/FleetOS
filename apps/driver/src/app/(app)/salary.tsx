import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useDriverStore } from '../../lib/driver-store';
import type { DriverSalaryEntry } from '@fleetos/shared';

export default function SalaryScreen() {
  const { t } = useTranslation();
  const driver = useDriverStore((s) => s.driver);
  const [entries, setEntries] = useState<DriverSalaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!driver) return;
    setLoading(true);
    const { data } = await supabase
      .from('driver_salary_entries')
      .select('*')
      .eq('driver_id', driver.id)
      .order('month', { ascending: false })
      .limit(12);
    if (data) setEntries(data);
    setLoading(false);
  }, [driver]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentMonth = entries.length > 0 ? entries[0] : null;
  const previousMonths = entries.slice(1);

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A3C6E" />
      </View>
    );
  }

  if (!currentMonth) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wallet-outline" size={48} color="#94A3B8" />
        <Text style={styles.emptyText}>{t('salary.no_data')}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: DriverSalaryEntry }) => (
    <View style={styles.historyCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyMonth}>{formatMonth(item.month)}</Text>
        <Text style={styles.historyNet}>₹{item.net_salary.toLocaleString('en-IN')}</Text>
      </View>
      <View style={[styles.statusBadge, {
        backgroundColor: item.status === 'paid' ? '#DCFCE7' : item.status === 'approved' ? '#DBEAFE' : '#F1F5F9',
      }]}>
        <Text style={[styles.statusText, {
          color: item.status === 'paid' ? '#166534' : item.status === 'approved' ? '#1E40AF' : '#64748B',
        }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Current Month Card */}
      <View style={styles.currentCard}>
        <Text style={styles.currentLabel}>{t('salary.current_month')}</Text>
        <Text style={styles.currentMonth}>{formatMonth(currentMonth.month)}</Text>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{t('salary.fixed_pay')}</Text>
          <Text style={styles.breakdownValue}>₹{currentMonth.fixed_pay.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{t('salary.trip_allowances')}</Text>
          <Text style={[styles.breakdownValue, { color: '#16A34A' }]}>
            +₹{currentMonth.trip_allowances.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{t('salary.deductions')}</Text>
          <Text style={[styles.breakdownValue, { color: '#DC2626' }]}>
            -₹{(currentMonth.advances_deducted + currentMonth.other_deductions).toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.breakdownRow}>
          <Text style={styles.netLabel}>{t('salary.net_salary')}</Text>
          <Text style={styles.netValue}>₹{currentMonth.net_salary.toLocaleString('en-IN')}</Text>
        </View>

        {currentMonth.slip_pdf_url && (
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => Linking.openURL(currentMonth.slip_pdf_url!)}
          >
            <Ionicons name="download" size={20} color="#FFF" />
            <Text style={styles.downloadText}>{t('salary.download_slip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Previous months */}
      {previousMonths.length > 0 && (
        <View style={{ flex: 1 }}>
          <FlashList
            data={previousMonths}
            renderItem={renderItem}
            estimatedItemSize={60}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  emptyText: { fontSize: 16, color: '#94A3B8', marginTop: 12 },
  currentCard: {
    backgroundColor: '#1A3C6E', borderRadius: 16, padding: 20, margin: 16,
  },
  currentLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  currentMonth: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: 14, color: '#CBD5E1' },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
  netLabel: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  netValue: { fontSize: 22, fontWeight: '700', color: '#F97316' },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F97316', borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  downloadText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  historyCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  historyMonth: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  historyNet: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
});
