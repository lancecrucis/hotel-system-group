CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','staff','admin')),
  first_name varchar(80) NOT NULL,
  last_name varchar(80) NOT NULL,
  date_of_birth date,
  email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  phone_number varchar(30) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE INDEX ON auth_sessions(expires_at);
CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number varchar(20) NOT NULL UNIQUE,
  room_type varchar(80) NOT NULL,
  description text NOT NULL DEFAULT '',
  price_per_night numeric(12,2) NOT NULL CHECK (price_per_night > 0),
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 20),
  bed_type varchar(80) NOT NULL,
  bed_count integer NOT NULL CHECK (bed_count BETWEEN 1 AND 10),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','maintenance','inactive')),
  image_url text NOT NULL DEFAULT '',
  has_wifi boolean NOT NULL DEFAULT true,
  breakfast_included boolean NOT NULL DEFAULT false,
  special_amenities text NOT NULL DEFAULT ''
);
CREATE TABLE room_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  reservation_type text NOT NULL CHECK (reservation_type IN ('hotel','restaurant')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','checked_out','arrived','seated','completed','cancelled','no_show','expired')),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  contact_name varchar(160) NOT NULL,
  contact_email varchar(254) NOT NULL,
  contact_phone varchar(30) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  cancellation_reason text,
  reservation_reference text NOT NULL UNIQUE,
  hold_expires_at timestamptz
);
CREATE INDEX ON reservations(user_id, created_at DESC);
CREATE INDEX ON reservations(status, hold_expires_at);
CREATE TABLE hotel_reservations (
  reservation_id uuid PRIMARY KEY REFERENCES reservations(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id),
  check_in date NOT NULL,
  check_out date NOT NULL CHECK (check_out > check_in),
  guest_count integer NOT NULL CHECK (guest_count > 0),
  price_per_night numeric(12,2) NOT NULL CHECK (price_per_night > 0),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  special_requests text NOT NULL DEFAULT ''
);
CREATE INDEX ON hotel_reservations(room_id, check_in, check_out);
CREATE TABLE restaurant_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  max_capacity integer NOT NULL CHECK (max_capacity BETWEEN 1 AND 500),
  opening_time time NOT NULL,
  closing_time time NOT NULL CHECK (closing_time > opening_time),
  max_guest_per_booking integer NOT NULL CHECK (max_guest_per_booking BETWEEN 1 AND max_capacity),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE restaurant_reservations (
  reservation_id uuid PRIMARY KEY REFERENCES reservations(id) ON DELETE CASCADE,
  reservation_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  guest_count integer NOT NULL CHECK (guest_count > 0),
  special_requests text NOT NULL DEFAULT '',
  arrived_at timestamptz,
  seated_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX ON restaurant_reservations(reservation_date, start_time, end_time);
CREATE TABLE reservation_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  reason text NOT NULL DEFAULT '',
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash','bank_transfer','external_card')),
  payment_status text NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('completed','refunded','partially_refunded')),
  transaction_reference text NOT NULL UNIQUE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  refund_amount numeric(12,2) NOT NULL CHECK (refund_amount > 0),
  refund_reason text NOT NULL,
  refund_reference text NOT NULL UNIQUE,
  processed_by uuid NOT NULL REFERENCES users(id),
  refund_status text NOT NULL DEFAULT 'completed' CHECK (refund_status = 'completed'),
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  reservation_id uuid REFERENCES reservations(id),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON notifications(user_id, created_at DESC);
CREATE TABLE admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  entity_id uuid,
  entity_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL
);
