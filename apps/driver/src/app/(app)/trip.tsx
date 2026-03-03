import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useDriverStore } from '../../lib/driver-store';
import type { LREntry } from '@fleetos/shared';

type LinkedLR = Pick<LREntry, 'id' | 'lr_number' | 'origin_city' | 'destination_city' | 'goods_description' | 'tracking_token'> & {
  consignee: { name: string } | null;
};

export default function TripDetailScreen() {
  const { t } = useTranslation();
  const trip = useDriverStore((s) => s.currentTrip);
  const [lrs, setLrs] = useState<LinkedLR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trip) return;
    (async () => {
      const { data } = await supabase
        .from('lr_entries')
        .select('id, lr_number, origin_city, destination_city, goods_description, tracking_token, consignee:consignee_id(name)')
        .eq('trip_id', trip.id);
      if (data) setLrs(data as unknown as LinkedLR[]);
      setLoading(false);
    })();
  }, [trip]);

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('home.no_trip')}</Text>
      </View>
    );
  }

  const stopovers = trip.stopovers ?? [];
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '') ?? '';

  const shareTracking = async (token: string, lrNumber: string) => {
    const url = `${baseUrl}/track/${token}`;
    await Share.share({
      message: `Track your shipment ${lrNumber} live: ${url}`,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Trip Info */}
      <View style={styles.card}>
        <Text style={styles.tripNumber}>{trip.trip_number}</Text>
        <View style={styles.routeRow}>
          <Ionicons name="navigate" size={18} color="#F97316" />
          <Text style={styles.routeText}>{trip.origin_city} → {trip.destination_city}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Vehicle */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('trip.vehicle')}</Text>
        <Text style={styles.infoText}>
          Odometer Start: {trip.odometer_start?.toLocaleString('en-IN')} km
        </Text>
        {trip.odometer_end && (
          <Text style={styles.infoText}>
            Odometer End: {trip.odometer_end.toLocaleString('en-IN')} km
          </Text>
        )}
      </View>

      {/* Stopovers */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('trip.stopovers')}</Text>
        {stopovers.length === 0 ? (
          <Text style={styles.emptyText}>{t('trip.no_stopovers')}</Text>
        ) : (
          stopovers.map((s: { city: string; expected_arrival: string }, idx: number) => (
            <View key={idx} style={styles.stopoverRow}>
              <Ionicons name="ellipse" size={8} color="#F97316" />
              <Text style={styles.stopoverText}>{s.city}</Text>
            </View>
          ))
        )}
      </View>

      {/* Linked LRs */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('trip.linked_lrs')}</Text>
        {loading ? (
          <ActivityIndicator color="#1A3C6E" />
        ) : lrs.length === 0 ? (
          <Text style={styles.emptyText}>{t('trip.no_lrs')}</Text>
        ) : (
          lrs.map((lr) => (
            <View key={lr.id} style={styles.lrRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lrNumber}>{lr.lr_number}</Text>
                <Text style={styles.lrMeta}>
                  {lr.consignee?.name ?? '—'} | {lr.goods_description ?? '—'}
                </Text>
              </View>
              {lr.tracking_token && (
                <TouchableOpacity
                  onPress={() => shareTracking(lr.tracking_token, lr.lr_number)}
                  style={styles.shareButton}
                >
                  <Ionicons name="share-social" size={20} color="#0EA5E9" />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  tripNumber: { fontSize: 18, fontWeight: '700', color: '#1A3C6E', fontFamily: 'monospace', marginBottom: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  routeText: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  statusBadge: {
    alignSelf: 'flex-start', backgroundColor: '#DBEAFE',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  statusText: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A3C6E', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#64748B', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  stopoverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  stopoverText: { fontSize: 14, color: '#1E293B' },
  lrRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  lrNumber: { fontSize: 14, fontWeight: '600', color: '#1A3C6E', fontFamily: 'monospace' },
  lrMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  shareButton: { padding: 8 },
});
