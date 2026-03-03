-- Migration 005: generate_trip_number() RPC
-- Atomically generates trip numbers per company.
-- Uses a company-level counter stored in companies table.
-- Format: T-{zero-padded-6-digit-sequence}
-- Example: T-000001, T-000002, ...

-- Add trip_current_sequence column to companies if not exists
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trip_current_sequence INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION generate_trip_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  UPDATE companies
  SET trip_current_sequence = trip_current_sequence + 1
  WHERE id = p_company_id
  RETURNING trip_current_sequence INTO v_seq;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company % not found', p_company_id;
  END IF;

  RETURN 'T-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION generate_trip_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_trip_number(UUID) TO authenticated;
