/**
 * GPS utility functions: Haversine distance, speed alert debounce, stationary detection.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate the Haversine distance between two GPS coordinates.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Check if two points are within a given radius (km).
 */
export function isWithinRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusKm: number
): boolean {
  return haversineDistance(lat1, lon1, lat2, lon2) <= radiusKm;
}

/**
 * Convert speed from m/s to km/h.
 */
export function msToKmh(speedMs: number): number {
  return Math.round(speedMs * 3.6 * 10) / 10;
}

/**
 * Check if a speed alert should be sent based on debounce window.
 * Returns true if no alert was sent in the last `debounceMinutes`.
 */
export function shouldSendSpeedAlert(
  lastAlertSent: string | null,
  debounceMinutes: number = 30
): boolean {
  if (!lastAlertSent) return true;
  const lastSent = new Date(lastAlertSent).getTime();
  const now = Date.now();
  return now - lastSent >= debounceMinutes * 60 * 1000;
}

/**
 * Check if a vehicle has been stationary for longer than the threshold.
 * Compares the latest location against an earlier location.
 */
export function isStationary(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  stationaryRadiusKm: number = 0.5
): boolean {
  return isWithinRadius(lat1, lon1, lat2, lon2, stationaryRadiusKm);
}

/** Speed limit for alert in km/h */
export const SPEED_LIMIT_KMPH = 80;

/** Stationary detection radius in km */
export const STATIONARY_RADIUS_KM = 0.5;

/** Stationary duration threshold in hours */
export const STATIONARY_HOURS_THRESHOLD = 2;

/** Speed alert debounce in minutes */
export const SPEED_ALERT_DEBOUNCE_MINUTES = 30;

/**
 * Determine which status buttons should be enabled for the driver based on current trip status.
 */
export function getDriverActionButtons(tripStatus: string): {
  depart: boolean;
  arrive: boolean;
  done: boolean;
} {
  return {
    depart: tripStatus === 'planned',
    arrive: tripStatus === 'departed' || tripStatus === 'in_transit',
    done: tripStatus === 'arrived',
  };
}
