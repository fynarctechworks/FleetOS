-- 008: Vehicle Health Score RPC
-- Computes health score based on:
-- - 10 points deducted per overdue scheduled service
-- - 5 points deducted per open breakdown in last 90 days
-- Minimum score is 0, maximum is 100.

CREATE OR REPLACE FUNCTION compute_vehicle_health_score(p_vehicle_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 100;
  v_overdue_services INTEGER;
  v_recent_breakdowns INTEGER;
  v_current_odometer INTEGER;
BEGIN
  -- Get current odometer
  SELECT current_odometer_km INTO v_current_odometer
  FROM vehicles WHERE id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
  END IF;

  -- Count overdue services: next_service_date < today OR next_service_km < current odometer
  SELECT COUNT(*) INTO v_overdue_services
  FROM maintenance_records
  WHERE vehicle_id = p_vehicle_id
    AND (
      (next_service_date IS NOT NULL AND next_service_date < CURRENT_DATE)
      OR
      (next_service_km IS NOT NULL AND next_service_km < v_current_odometer)
    );

  -- Count breakdowns in last 90 days (service_type = 'other' as proxy for breakdown)
  SELECT COUNT(*) INTO v_recent_breakdowns
  FROM maintenance_records
  WHERE vehicle_id = p_vehicle_id
    AND service_type IN ('other', 'electrical', 'body')
    AND serviced_at > (CURRENT_TIMESTAMP - INTERVAL '90 days');

  -- Calculate score
  v_score := v_score - (v_overdue_services * 10) - (v_recent_breakdowns * 5);

  -- Floor at 0
  IF v_score < 0 THEN
    v_score := 0;
  END IF;

  -- Update vehicle health_score
  UPDATE vehicles SET health_score = v_score WHERE id = p_vehicle_id;

  RETURN v_score;
END;
$$;
