import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '../../lib/supabase';

type MaintenanceItem = {
  id: string;
  service_type: string;
  description: string | null;
  cost: number;
  odometer_at_service: number;
  serviced_at: string;
  next_service_date: string | null;
  next_service_km: number | null;
  workshop_name: string | null;
  vehicle: { registration_number: string } | null;
};

const SERVICE_LABELS: Record<string, string> = {
  oil_change: 'Oil Change',
  brake: 'Brake Service',
  clutch: 'Clutch Repair',
  battery: 'Battery',
  tyre: 'Tyre Service',
  electrical: 'Electrical',
  body: 'Body Work',
  other: 'Other',
};

export default function MaintenanceScreen() {
  const [records, setRecords] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('maintenance_records')
      .select('*, vehicle:vehicle_id(registration_number)')
      .order('serviced_at', { ascending: false })
      .limit(100);
    if (data) setRecords(data as unknown as MaintenanceItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

  const renderItem = ({ item }: { item: MaintenanceItem }) => {
    const isOverdue = item.next_service_date && new Date(item.next_service_date) < new Date();
    return (
      <View style={[styles.card, isOverdue && styles.cardOverdue]}>
        <View style={styles.cardHeader}>
          <Text style={styles.vehicle}>{item.vehicle?.registration_number ?? '—'}</Text>
          <Text style={styles.cost}>₹{item.cost.toLocaleString('en-IN')}</Text>
        </View>
        <Text style={styles.serviceType}>
          {SERVICE_LABELS[item.service_type] ?? item.service_type}
        </Text>
        {item.description && <Text style={styles.description}>{item.description}</Text>}
        <View style={styles.cardFooter}>
          <Text style={styles.date}>
            {new Date(item.serviced_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          <Text style={styles.odometer}>{item.odometer_at_service.toLocaleString('en-IN')} km</Text>
        </View>
        {item.next_service_date && (
          <Text style={[styles.nextService, isOverdue && { color: '#DC2626' }]}>
            Next: {new Date(item.next_service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {item.next_service_km ? ` / ${item.next_service_km.toLocaleString('en-IN')} km` : ''}
          </Text>
        )}
        {item.workshop_name && (
          <Text style={styles.workshop}>{item.workshop_name}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Total Cost Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>Total Service Costs</Text>
        <Text style={styles.bannerValue}>₹{totalCost.toLocaleString('en-IN')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1A3C6E" style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={records}
          renderItem={renderItem}
          estimatedItemSize={140}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No maintenance records.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  banner: {
    backgroundColor: '#1A3C6E', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  bannerLabel: { fontSize: 14, color: '#94A3B8' },
  bannerValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardOverdue: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  vehicle: { fontSize: 15, fontWeight: '600', color: '#1A3C6E' },
  cost: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  serviceType: { fontSize: 13, fontWeight: '500', color: '#1E293B', marginBottom: 2 },
  description: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  date: { fontSize: 12, color: '#64748B' },
  odometer: { fontSize: 12, color: '#64748B' },
  nextService: { fontSize: 11, color: '#D97706', marginTop: 4 },
  workshop: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
