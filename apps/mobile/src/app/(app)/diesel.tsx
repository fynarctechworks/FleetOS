import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '../../lib/supabase';

type DieselItem = {
  id: string;
  litres: number;
  price_per_litre: number;
  total_cost: number;
  station_name: string | null;
  odometer_at_fill: number;
  filled_at: string;
  is_theft_flagged: boolean;
  vehicle: { registration_number: string } | null;
  driver: { name: string } | null;
  trip: { trip_number: string } | null;
};

export default function DieselScreen() {
  const [entries, setEntries] = useState<DieselItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('diesel_entries')
      .select(
        `id, litres, price_per_litre, total_cost, station_name,
         odometer_at_fill, filled_at, is_theft_flagged,
         vehicle:vehicle_id(registration_number),
         driver:driver_id(name),
         trip:trip_id(trip_number)`
      )
      .order('filled_at', { ascending: false })
      .limit(100);

    if (data) setEntries(data as unknown as DieselItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const totalCost = entries.reduce((sum, e) => sum + e.total_cost, 0);
  const totalLitres = entries.reduce((sum, e) => sum + e.litres, 0);

  const renderEntry = ({ item }: { item: DieselItem }) => (
    <View style={[styles.card, item.is_theft_flagged && styles.cardFlagged]}>
      <View style={styles.cardHeader}>
        <Text style={styles.vehicle}>{item.vehicle?.registration_number ?? '—'}</Text>
        <Text style={styles.cost}>₹{item.total_cost.toLocaleString('en-IN')}</Text>
      </View>
      <Text style={styles.details}>
        {item.litres}L @ ₹{item.price_per_litre}/L
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>
          {item.driver?.name ?? '—'} | {item.trip?.trip_number ?? '—'}
        </Text>
        {item.is_theft_flagged && (
          <Text style={styles.flagText}>FLAGGED</Text>
        )}
      </View>
      <Text style={styles.date}>
        {new Date(item.filled_at).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: '2-digit',
        })} | Odo: {item.odometer_at_fill.toLocaleString('en-IN')} km
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Litres</Text>
          <Text style={styles.summaryValue}>{totalLitres.toLocaleString('en-IN', { maximumFractionDigits: 0 })} L</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Cost</Text>
          <Text style={styles.summaryValue}>₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1A3C6E" style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={entries}
          renderItem={renderEntry}
          estimatedItemSize={100}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No diesel entries yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 4,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLabel: { fontSize: 12, color: '#64748B' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardFlagged: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicle: { fontSize: 15, fontWeight: '700', color: '#1A3C6E' },
  cost: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  details: { fontSize: 13, color: '#1E293B', marginBottom: 6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: { fontSize: 12, color: '#64748B' },
  flagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
