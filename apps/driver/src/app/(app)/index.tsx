import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/auth-store';
import { useDriverStore } from '../../lib/driver-store';
import { getDriverActionButtons } from '@fleetos/shared';
import {
  startLocationTracking,
  stopLocationTracking,
  isTrackingActive,
} from '../../lib/location-service';
import type { Trip } from '@fleetos/shared';

type TripWithVehicle = Trip & {
  vehicle: { registration_number: string } | null;
};

export default function DriverHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appUser } = useAuthStore();
  const {
    driver, currentTrip, isTracking,
    setDriver, setCurrentTrip, setTracking, updateTripStatus,
  } = useDriverStore();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!appUser) return;
    setLoading(true);

    // Fetch driver record
    const { data: driverData } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', appUser.id)
      .single();

    if (driverData) {
      setDriver(driverData);

      // Fetch today's active trip
      const { data: tripData } = await supabase
        .from('trips')
        .select('*, vehicle:vehicle_id(registration_number)')
        .eq('driver_id', driverData.id)
        .in('status', ['planned', 'departed', 'in_transit', 'arrived'])
        .order('planned_departure', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (tripData) {
        setCurrentTrip(tripData as unknown as TripWithVehicle);
      }
    }

    // Check tracking status
    const tracking = await isTrackingActive();
    setTracking(tracking);
    setLoading(false);
  }, [appUser, setDriver, setCurrentTrip, setTracking]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusUpdate = async (newStatus: 'departed' | 'arrived' | 'completed') => {
    if (!currentTrip || !driver) return;
    setActionLoading(true);

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'departed') updates.actual_departure = new Date().toISOString();
    if (newStatus === 'arrived') updates.actual_arrival = new Date().toISOString();
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', currentTrip.id);

    if (error) {
      Alert.alert(t('common.error'), error.message);
      setActionLoading(false);
      return;
    }

    updateTripStatus(newStatus);

    // Start GPS on depart
    if (newStatus === 'departed') {
      const started = await startLocationTracking({
        companyId: currentTrip.company_id,
        vehicleId: currentTrip.vehicle_id,
        driverId: driver.id,
        tripId: currentTrip.id,
      });
      setTracking(started);
    }

    // Stop GPS on complete
    if (newStatus === 'completed') {
      await stopLocationTracking();
      setTracking(false);

      // Trigger P&L + diesel theft detection
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (token) {
        await supabase.functions.invoke('calculate-trip-pl', {
          body: { trip_id: currentTrip.id },
          headers: { Authorization: `Bearer ${token}` },
        });
        await supabase.functions.invoke('detect-diesel-theft', {
          body: { trip_id: currentTrip.id },
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }

    setActionLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A3C6E" />
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={48} color="#DC2626" />
        <Text style={styles.errorText}>{t('login.no_driver_record')}</Text>
      </View>
    );
  }

  const buttons = currentTrip ? getDriverActionButtons(currentTrip.status) : null;
  const trip = currentTrip as TripWithVehicle | null;

  return (
    <View style={styles.container}>
      {/* GPS Indicator */}
      <View style={[styles.gpsIndicator, { backgroundColor: isTracking ? '#DCFCE7' : '#F1F5F9' }]}>
        <View style={[styles.gpsDot, { backgroundColor: isTracking ? '#16A34A' : '#94A3B8' }]} />
        <Text style={[styles.gpsText, { color: isTracking ? '#166534' : '#64748B' }]}>
          {isTracking ? t('home.tracking_active') : t('home.tracking_inactive')}
        </Text>
      </View>

      {trip ? (
        <>
          {/* Trip Card */}
          <TouchableOpacity
            style={styles.tripCard}
            onPress={() => router.push('/(app)/trip')}
            activeOpacity={0.8}
          >
            <Text style={styles.tripNumber}>{trip.trip_number}</Text>
            <View style={styles.routeRow}>
              <Ionicons name="navigate" size={18} color="#F97316" />
              <Text style={styles.routeText}>
                {trip.origin_city} → {trip.destination_city}
              </Text>
            </View>
            {trip.vehicle && (
              <View style={styles.infoRow}>
                <Ionicons name="car" size={16} color="#64748B" />
                <Text style={styles.infoText}>{trip.vehicle.registration_number}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color="#64748B" />
              <Text style={styles.infoText}>
                {t('home.planned_departure')}: {new Date(trip.planned_departure).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
            <Text style={styles.tapHint}>Tap for details →</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {buttons && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.departButton, !buttons.depart && styles.buttonInactive]}
                  onPress={() => buttons.depart && handleStatusUpdate('departed')}
                  disabled={!buttons.depart || actionLoading}
                  activeOpacity={0.8}
                >
                  {actionLoading && buttons.depart ? (
                    <ActivityIndicator color="#FFF" size="large" />
                  ) : (
                    <>
                      <Ionicons name="airplane" size={32} color={buttons.depart ? '#FFF' : '#94A3B8'} />
                      <Text style={[styles.actionText, !buttons.depart && styles.actionTextInactive]}>
                        {t('home.depart')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.arriveButton, !buttons.arrive && styles.buttonInactive]}
                  onPress={() => buttons.arrive && handleStatusUpdate('arrived')}
                  disabled={!buttons.arrive || actionLoading}
                  activeOpacity={0.8}
                >
                  {actionLoading && buttons.arrive ? (
                    <ActivityIndicator color="#FFF" size="large" />
                  ) : (
                    <>
                      <Ionicons name="location" size={32} color={buttons.arrive ? '#FFF' : '#94A3B8'} />
                      <Text style={[styles.actionText, !buttons.arrive && styles.actionTextInactive]}>
                        {t('home.arrive')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.doneButton, !buttons.done && styles.buttonInactive]}
                  onPress={() => buttons.done && handleStatusUpdate('completed')}
                  disabled={!buttons.done || actionLoading}
                  activeOpacity={0.8}
                >
                  {actionLoading && buttons.done ? (
                    <ActivityIndicator color="#FFF" size="large" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={32} color={buttons.done ? '#FFF' : '#94A3B8'} />
                      <Text style={[styles.actionText, !buttons.done && styles.actionTextInactive]}>
                        {t('home.done')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="sunny" size={64} color="#F97316" />
          <Text style={styles.emptyTitle}>{t('home.no_trip')}</Text>
          <Text style={styles.emptySub}>{t('home.no_trip_sub')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 24 },
  errorText: { fontSize: 16, color: '#DC2626', textAlign: 'center', marginTop: 16 },
  gpsIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 12, marginBottom: 16,
  },
  gpsDot: { width: 10, height: 10, borderRadius: 5 },
  gpsText: { fontSize: 13, fontWeight: '600' },
  tripCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 2, borderColor: '#1A3C6E', marginBottom: 24,
  },
  tripNumber: { fontSize: 20, fontWeight: '700', color: '#1A3C6E', fontFamily: 'monospace', marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  routeText: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 14, color: '#64748B' },
  tapHint: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1, borderRadius: 16, paddingVertical: 24,
    alignItems: 'center', justifyContent: 'center', minHeight: 100,
  },
  departButton: { backgroundColor: '#F97316' },
  arriveButton: { backgroundColor: '#0EA5E9' },
  doneButton: { backgroundColor: '#16A34A' },
  buttonInactive: { backgroundColor: '#E2E8F0' },
  actionText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 6 },
  actionTextInactive: { color: '#94A3B8' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#64748B', marginTop: 4 },
});
