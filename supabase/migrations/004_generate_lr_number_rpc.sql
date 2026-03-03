-- Migration 004: generate_lr_number() RPC
-- Atomically increments branch LR sequence and returns a formatted LR number.
-- Format: {PREFIX}-{zero-padded-6-digit-sequence}
-- Example: VZG-000001, VZG-000002, ...
-- Run in Supabase SQL Editor after migrations 001, 002, 003.

CREATE OR REPLACE FUNCTION generate_lr_number(p_branch_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INTEGER;
BEGIN
  -- Atomically increment sequence and capture new values
  UPDATE branches
  SET lr_current_sequence = lr_current_sequence + 1
  WHERE id = p_branch_id
  RETURNING lr_prefix, lr_current_sequence INTO v_prefix, v_seq;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch % not found', p_branch_id;
  END IF;

  RETURN v_prefix || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION generate_lr_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_lr_number(UUID) TO authenticated;
