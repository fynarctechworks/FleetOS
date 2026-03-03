-- Migration 003: Add encrypt_bank_account RPC function
-- Uses pgcrypto's pgp_sym_encrypt for AES-256 encryption of bank account numbers.
-- Called from the encrypt-bank-account Edge Function only.

CREATE OR REPLACE FUNCTION encrypt_bank_account(
  p_driver_id UUID,
  p_account_number TEXT,
  p_encryption_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE drivers
  SET bank_account_number = encode(
    pgp_sym_encrypt(p_account_number, p_encryption_key),
    'base64'
  )
  WHERE id = p_driver_id;
END;
$$;

-- Also add a decrypt function for reading (server-side only)
CREATE OR REPLACE FUNCTION decrypt_bank_account(
  p_driver_id UUID,
  p_encryption_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_encrypted TEXT;
  v_decrypted TEXT;
BEGIN
  SELECT bank_account_number INTO v_encrypted
  FROM drivers
  WHERE id = p_driver_id;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  v_decrypted := pgp_sym_decrypt(
    decode(v_encrypted, 'base64'),
    p_encryption_key
  );

  RETURN v_decrypted;
END;
$$;
