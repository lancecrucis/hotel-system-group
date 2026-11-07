export interface User {
  id: string;
  role: 'customer' | 'staff' | 'admin';
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth?: string | null;
}
export interface Room {
  id: string;
  room_number: string;
  room_type: string;
  description: string;
  price_per_night: string;
  capacity: number;
  bed_type: string;
  bed_count: number;
  status: string;
  image_url: string;
  has_wifi: boolean;
  breakfast_included: boolean;
  special_amenities: string;
  available: boolean;
  images: { image_url: string }[];
}
export interface Reservation {
  id: string;
  user_id: string;
  reservation_type: 'hotel' | 'restaurant';
  status: string;
  total_amount: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  reservation_reference: string;
  created_at: string;
  hold_expires_at: string | null;
  paid_amount: string;
  refunded_amount: string;
  cancellation_reason: string | null;
  hotel: {
    room_number: string;
    room_type: string;
    check_in: string;
    check_out: string;
    guest_count: number;
    price_per_night: string;
    special_requests: string;
    checked_in_at: string | null;
    checked_out_at: string | null;
  } | null;
  restaurant: {
    reservation_date: string;
    start_time: string;
    end_time: string;
    guest_count: number;
    special_requests: string;
    arrived_at: string | null;
    seated_at: string | null;
    completed_at: string | null;
  } | null;
}
export interface Payment {
  id: string;
  amount: string;
  payment_method: string;
  payment_status: string;
  transaction_reference: string;
  paid_at: string;
}
export interface Refund {
  id: string;
  payment_id: string;
  refund_amount: string;
  refund_reason: string;
  refund_reference: string;
  processed_at: string;
}
export interface Detail {
  reservation: Reservation;
  history: {
    id: string;
    new_status: string;
    reason: string;
    changed_at: string;
    changed_by_name: string | null;
  }[];
  payments: Payment[];
  refunds: Refund[];
  allowed_actions: string[];
}
export interface Settings {
  max_capacity: number;
  max_guest_per_booking: number;
  opening_time: string;
  closing_time: string;
  updated_at: string;
}
export interface Notice {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  reservation_id: string | null;
}
