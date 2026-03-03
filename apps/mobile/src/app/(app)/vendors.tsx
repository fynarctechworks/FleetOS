import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/lib/supabase';
import type { Vendor } from '@fleetos/shared';

export default function VendorsScreen() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVendors = useCallback(async () => {
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setVendors((data as Vendor[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const totalDue = vendors.reduce((sum, v) => sum + v.balance_due, 0);

  const renderItem = ({ item }: { item: Vendor }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.vendorName}>{item.name}</Text>
        <Text style={[styles.balance, item.balance_due > 0 ? styles.balanceDue : styles.balanceClear]}>
          ₹{item.balance_due.toLocaleString('en-IN')}
        </Text>
      </View>
      {item.phone && <Text style={styles.detail}>{item.phone}</Text>}
      {item.vehicle_number && (
        <Text style={styles.detail}>Vehicle: {item.vehicle_number}</Text>
      )}
      {item.route_specialisation && (
        <Text style={styles.detail}>Route: {item.route_specialisation}</Text>
      )}
      <View style={styles.rateRow}>
        {item.rate_per_km ? (
          <Text style={styles.rate}>₹{item.rate_per_km}/km</Text>
        ) : null}
        {item.rate_per_trip ? (
          <Text style={styles.rate}>₹{item.rate_per_trip}/trip</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Vendors</Text>
          <Text style={styles.summaryValue}>{vendors.length}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: totalDue > 0 ? '#FEF2F2' : '#F0FDF4' }]}>
          <Text style={styles.summaryLabel}>Total Due</Text>
          <Text style={[styles.summaryValue, { color: totalDue > 0 ? '#DC2626' : '#16A34A' }]}>
            ₹{totalDue.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <FlashList
        data={vendors}
        renderItem={renderItem}
        estimatedItemSize={100}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); fetchVendors(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No vendors yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  summary: { flexDirection: 'row', gap: 12, padding: 16 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  summaryLabel: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginTop: 4 },
  card: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  vendorName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  balance: { fontSize: 16, fontWeight: '700' },
  balanceDue: { color: '#DC2626' },
  balanceClear: { color: '#16A34A' },
  detail: { fontSize: 13, color: '#64748B', marginBottom: 2 },
  rateRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rate: {
    fontSize: 12, color: '#1A3C6E', fontWeight: '500',
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#64748B' },
});
