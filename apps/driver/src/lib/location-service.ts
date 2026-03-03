/**
 * Background GPS location tracking service for FleetOS Driver App.
 * Uses expo-location with TaskManager for background updates.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';
import { msToKmh, SPEED_LIMIT_KMPH } from '@fleetos/shared';

export const LOCATION_TASK_NAME = 'FLEETOSHA-LOCATION-TASK';

interface LocationTaskData {
  locations: Location.LocationObject[];
}

// Store active tracking context
let activeTrackingContext: {
  companyId: string;
  vehicleId: string;
  driverId: string;
  tripId: string;
} | null = null;

/**
 * Define the background location task.
 * Must be called at the top level of the app (outside of components).
 */
export function defineLocationTask(): void {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('[GPS] Background task error:', error.message);
      return;
    }

    if (!data || !activeTrackingContext) return;

    const { locations } = data as LocationTaskData;
    const ctx = activeTrackingContext;

    for (const loc of locations) {
      const speedKmph = loc.coords.speed != null ? msToKmh(loc.coords.speed) : null;

      // Insert into vehicle_locations
      await supabase.from('vehicle_locations').insert({
        company_id: ctx.companyId,
        vehicle_id: ctx.vehicleId,
        driver_id: ctx.driverId,
        trip_id: ctx.tripId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        speed_kmph: speedKmph,
        accuracy_meters: loc.coords.accuracy ?? 0,
        recorded_at: new Date(loc.timestamp).toISOString(),
        is_online: true,
      });

      // Update vehicle's last known position
      await supabase
        .from('vehicles')
        .update({
          last_lat: loc.coords.latitude,
          last_lng: loc.coords.longitude,
          last_seen: new Date(loc.timestamp).toISOString(),
        })
        .eq('id', ctx.vehicleId);

      // Speed alert: trigger if exceeding limit
      if (speedKmph != null && speedKmph > SPEED_LIMIT_KMPH) {
        supabase.functions.invoke('check-speed-alert', {
          body: {
            vehicle_id: ctx.vehicleId,
            speed_kmph: speedKmph,
            trip_id: ctx.tripId,
            company_id: ctx.companyId,
          },
        }).catch((err) => console.error('[GPS] Speed alert error:', err));
      }
    }
  });
}

/**
 * Request location permissions with user-friendly explanation.
 * Returns true if permissions are granted.
 */
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  return background === 'granted';
}

/**
 * Start background location tracking for a trip.
 */
export async function startLocationTracking(context: {
  companyId: string;
  vehicleId: string;
  driverId: string;
  tripId: string;
}): Promise<boolean> {
  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) return false;

  activeTrackingContext = context;

  const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (isTracking) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000, // 30 seconds
    distanceInterval: 100, // 100 meters
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'FleetOS Location Tracking',
      notificationBody: 'FleetOS is tracking your location for this trip.',
      notificationColor: '#1A3C6E',
    },
  });

  return true;
}

/**
 * Stop background location tracking.
 */
export async function stopLocationTracking(): Promise<void> {
  const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (isTracking) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  activeTrackingContext = null;
}

/**
 * Check if location tracking is currently active.
 */
export async function isTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
}
