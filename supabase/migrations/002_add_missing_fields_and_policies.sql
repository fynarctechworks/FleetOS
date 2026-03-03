-- FleetOS Migration 002 — Add missing vehicle GPS fields + branch/driver RLS policies
-- From TRD Section 4 (vehicle_locations retention note) and Section 6.2

-- ─── Missing vehicle fields for fast dashboard GPS queries ───
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_lat NUMERIC(10,7);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_lng NUMERIC(10,7);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- ─── Branch Manager RLS policies (own branch only) ───
-- Branch managers can only see data from their assigned branch.
-- If branch_id in JWT is NULL, they see all branches (owner/accountant behavior).

CREATE POLICY "branches_manager_access" ON branches
  FOR SELECT USING (
    company_id = (auth.jwt()->>'company_id')::uuid
    AND (
      (auth.jwt()->>'branch_id') IS NULL
      OR id = (auth.jwt()->>'branch_id')::uuid
    )
  );

CREATE POLICY "lr_entries_branch_access" ON lr_entries
  FOR ALL USING (
    company_id = (auth.jwt()->>'company_id')::uuid
    AND (
      (auth.jwt()->>'branch_id') IS NULL
      OR branch_id = (auth.jwt()->>'branch_id')::uuid
    )
  );

CREATE POLICY "trips_branch_access" ON trips
  FOR ALL USING (
    company_id = (auth.jwt()->>'company_id')::uuid
    AND (
      (auth.jwt()->>'branch_id') IS NULL
      OR branch_id = (auth.jwt()->>'branch_id')::uuid
    )
  );

-- ─── Driver RLS policies (own trips/data only) ───
CREATE POLICY "trips_driver_access" ON trips
  FOR SELECT USING (
    company_id = (auth.jwt()->>'company_id')::uuid
    AND driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "diesel_entries_driver_access" ON diesel_entries
  FOR ALL USING (
    company_id = (auth.jwt()->>'company_id')::uuid
    AND driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "vehicle_locations_driver_insert" ON vehicle_locations
  FOR INSERT WITH CHECK (
    company_id = (auth.jwt()->>'company_id')::uuid
    AND driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- ─── Missing index for lr_entries trip lookup ───
CREATE INDEX IF NOT EXISTS idx_lr_entries_trip ON lr_entries (trip_id);
