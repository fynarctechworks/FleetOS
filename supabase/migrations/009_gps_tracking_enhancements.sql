-- Migration 009: GPS Tracking Enhancements
-- Adds stationary alert flag to trips, speed alert timestamp to vehicles,
-- and a view for latest vehicle locations.

-- 1. Add stationary alert flag to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS stationary_alert_sent BOOLEAN DEFAULT false;

-- 2. Add speed alert debounce timestamp to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_speed_alert_sent TIMESTAMPTZ;

-- 3. Create a view that returns the latest location for each vehicle
CREATE OR REPLACE VIEW v_latest_vehicle_locations AS
SELECT DISTINCT ON (vl.vehicle_id)
  vl.id,
  vl.company_id,
  vl.vehicle_id,
  vl.driver_id,
  vl.trip_id,
  vl.latitude,
  vl.longitude,
  vl.speed_kmph,
  vl.accuracy_meters,
  vl.recorded_at,
  vl.is_online,
  v.registration_number,
  v.vehicle_type,
  v.is_active AS vehicle_active,
  d.name AS driver_name,
  d.phone AS driver_phone,
  t.trip_number,
  t.status AS trip_status,
  t.origin_city,
  t.destination_city
FROM vehicle_locations vl
JOIN vehicles v ON v.id = vl.vehicle_id
LEFT JOIN drivers d ON d.id = vl.driver_id
LEFT JOIN trips t ON t.id = vl.trip_id
WHERE v.is_active = true
ORDER BY vl.vehicle_id, vl.recorded_at DESC;

-- 4. Index for fast latest-location lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle_recorded
  ON vehicle_locations (vehicle_id, recorded_at DESC);

-- 5. Index for trip-based location queries (route playback)
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_trip_recorded
  ON vehicle_locations (trip_id, recorded_at ASC)
  WHERE trip_id IS NOT NULL;

-- 6. RLS: the view inherits RLS from the underlying tables.
-- Ensure vehicle_locations table has RLS (should exist from migration 001).
-- If not, add it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_locations' AND policyname = 'company_isolation'
  ) THEN
    ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY company_isolation ON vehicle_locations
      USING (company_id = (auth.jwt()->>'company_id')::uuid);
  END IF;
END $$;
