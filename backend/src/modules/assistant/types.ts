export type AssistantCard =
  | { type: 'rooms'; rooms: RoomCard[] }
  | { type: 'booking_confirmation'; intent_id: string; expires_at: string; reservation: ReservationCard }
  | { type: 'cancellation_confirmation'; intent_id: string; expires_at: string; reservation: ReservationCard; reason: string }
  | { type: 'reservation_status'; reservation: ReservationCard }
  | { type: 'reservation_list'; reservations: ReservationCard[] };

export type RoomCard = {
  id: string;
  room_number: string;
  room_type: string;
  description: string;
  price_per_night: string;
  capacity: number;
  bed_type: string;
  bed_count: number;
  image_url: string;
  has_wifi: boolean;
  breakfast_included: boolean;
};

export type ReservationCard = {
  id?: string;
  reference: string;
  status: string;
  room_type?: string;
  room_number?: string;
  check_in?: string;
  check_out?: string;
  guest_count?: number;
  subtotal?: string;
  tax?: string;
  service_fee?: string;
  total?: string;
};
