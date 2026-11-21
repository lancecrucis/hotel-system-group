CREATE TABLE assistant_confirmation_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('book_room', 'cancel_room')),
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  result_reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assistant_confirmation_intents_user_expiry_idx
  ON assistant_confirmation_intents(user_id, expires_at)
  WHERE consumed_at IS NULL;
