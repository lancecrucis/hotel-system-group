-- Migration 007: email verification, rate limiting on reset tokens
BEGIN;

-- Email verification
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

CREATE TABLE email_verification_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON email_verification_tokens(user_id);

-- Rate limit: track recent resets per email
ALTER TABLE password_reset_tokens ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX ON password_reset_tokens(created_at);

-- Optional: phone verification for future SMS support
CREATE TABLE phone_verification_codes (
  code_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON phone_verification_codes(user_id);

COMMIT;