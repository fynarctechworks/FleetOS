import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '../../lib/supabase';
import { tyreNeedsReplacement } from '@fleetos/shared';
import type { TyrePosition } from '@fleetos/shared';

type TyreItem = {
  id: string;
  brand: string | null;
  serial_number: string | null;
  position: TyrePosition;
  current_km: number;
  expected_life_km: number;
  is_retreaded: boolean;
  status: 'active' | 'replaced' | 'retreaded';
  vehicle: { registration_number: string } | null;
};

const POSITION_LABELS: Record<TyrePosition, string> = {
  fl: 'Front Left',
  fr: 'Front Right',
  rl: 'Rear Left',
  rr: 'Rear Right',
  spare: 'Spare',
};

export default function TyresScreen() {
  const [tyres, setTyres] = useState<TyreItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tyre_records')
      .select('*, vehicle:vehicle_id(registration_number)')
      .order('fitment_date', { ascending: false })
      .limit(200);
    if (data) setTyres(data as unknown as TyreItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const alertCount = tyres.filter((t) => t.status === 'active' && tyreNeedsReplacement(t.current_km, t.expected_life_km)).length;

  const renderItem = ({ item }: { item: TyreItem }) => {
    const lifePercent = item.expected_life_km > 0
      ? Math.min(100, Math.round((item.current_km / item.expected_life_km) * 100))
      : 0;
    const needsReplace = tyreNeedsReplacement(item.current_km, item.expected_life_km);
    const barColor = needsReplace ? '#EF4444' : lifePercent > 60 ? '#F59E0B' : '#22C55E';

    return (
      <View style={[styles.card, needsReplace && styles.cardAlert]}>
        <View style={styles.cardHeader}>
          <Text style={styles.vehicle}>{item.vehicle?.registration_number ?? '—'}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'active' ? '#DCFCE7' : item.status === 'replaced' ? '#F1F5F9' : '#DBEAFE' },
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'active' ? '#166534' : item.status === 'replaced' ? '#475569' : '#1E40AF' },
            ]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.position}>{POSITION_LABELS[item.position]}</Text>
        <Text style={styles.brand}>
          {item.brand ?? 'Unknown'}{item.serial_number ? ` · ${item.serial_number}` : ''}
          {item.is_retreaded ? ' · Retreaded' : ''}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>{item.current_km.toLocaleString('en-IN')} km</Text>
            <Text style={styles.progressText}>{item.expected_life_km.toLocaleString('en-IN')} km</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${lifePercent}%`, backgroundColor: barColor }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.percentText, needsReplace && { color: '#DC2626', fontWeight: '700' }]}>
              {lifePercent}% used
            </Text>
            {needsReplace && <Text style={styles.replaceAlert}>Replace Soon</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Alert Banner */}
      {alertCount > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{alertCount} tyre(s) need replacement</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#1A3C6E" style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={tyres}
          renderItem={renderItem}
          estimatedItemSize={160}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No tyres recorded.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  alertBanner: {
    backgroundColor: '#FEE2E2', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#FECACA',
  },
  alertText: { fontSize: 13, fontWeight: '600', color: '#991B1B', textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardAlert: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  vehicle: { fontSize: 15, fontWeight: '600', color: '#1A3C6E' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  position: { fontSize: 13, fontWeight: '500', color: '#1E293B', marginBottom: 2 },
  brand: { fontSize: 11, color: '#64748B' },
  progressContainer: { marginTop: 10 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 10, color: '#64748B' },
  progressTrack: {
    height: 8, backgroundColor: '#E2E8F0', borderRadius: 4,
    marginVertical: 4, overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 4 },
  percentText: { fontSize: 11, color: '#64748B' },
  replaceAlert: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
