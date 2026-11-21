import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../../config/database.js';
import { HttpError, date, text, uuid } from '../../../shared/utils/http.js';
import { transaction } from '../../../shared/utils/transaction.js';
import { roomAvailable, validateStay } from '../../hotel-reservations/repositories/rooms.js';
import { calculateHotelTotals } from '../../hotel-reservations/services/billing.js';
import { createHotelReservation, hotelReservationInput } from '../../hotel-reservations/services/reservations.js';
import { reservationSelect } from '../../reservation-tracking/repositories/reservations.js';
import { prepareCustomerHotelCancellation } from '../../reservation-tracking/services/customer-cancellation.js';
import type { AssistantCard, ReservationCard, RoomCard } from '../types.js';

type AssistantUser = Express.Request['user'] | undefined;

const searchSchema = z.object({
  check_in: date,
  check_out: date,
  guest_count: z.number().int().min(1).max(6),
}).strict();
const prepareSchema = z.object({
  room_id: uuid,
  check_in: date,
  check_out: date,
  guest_count: z.number().int().min(1).max(6),
  special_requests: text(2000).default(''),
}).strict();
const cancelSchema = z.object({
  booking_reference: text(40).min(1),
  cancellation_reason: text(1000).min(1),
}).strict();
const statusSchema = z.object({ booking_reference: text(40).min(1).optional() }).strict();

function customer(user: AssistantUser) {
  if (!user) throw new HttpError(401, 'Please sign in before managing a reservation.');
  if (user.role !== 'customer') throw new HttpError(403, 'This assistant is available for customer reservations only.');
  return user;
}

function reservationCard(row: Record<string, any>): ReservationCard {
  return {
    id: row.id,
    reference: row.reservation_reference,
    status: row.status,
    room_type: row.hotel?.room_type,
    room_number: row.hotel?.room_number,
    check_in: row.hotel?.check_in,
    check_out: row.hotel?.check_out,
    guest_count: row.hotel?.guest_count,
    subtotal: row.subtotal_amount,
    tax: row.tax_amount,
    service_fee: row.service_fee_amount,
    total: row.total_amount,
  };
}

async function searchAvailableRooms(args: unknown) {
  const data = searchSchema.parse(args);
  const nights = await validateStay(pool, data.check_in, data.check_out);
  if (!nights) throw new HttpError(400, 'Choose a future stay between 1 and 30 nights.');
  const result = await pool.query(
    `SELECT id,room_number,room_type,description,price_per_night::text,capacity,bed_type,bed_count,image_url,has_wifi,breakfast_included
     FROM rooms WHERE status='available' AND housekeeping_status IN ('clean','inspected') AND capacity >= $1 ORDER BY price_per_night,room_number`,
    [data.guest_count],
  );
  const rooms: RoomCard[] = [];
  for (const room of result.rows) {
    if (await roomAvailable(pool, room.id, data.check_in, data.check_out)) rooms.push(room);
  }
  return { data: { check_in: data.check_in, check_out: data.check_out, guest_count: data.guest_count, nights, rooms }, card: { type: 'rooms', rooms } satisfies AssistantCard };
}

async function prepareRoomReservation(args: unknown, user: AssistantUser) {
  const account = customer(user);
  const data = prepareSchema.parse(args);
  const nights = await validateStay(pool, data.check_in, data.check_out);
  if (!nights) throw new HttpError(400, 'Choose a future stay between 1 and 30 nights.');
  const room = (
    await pool.query(
      `SELECT id,room_number,room_type,description,price_per_night::text,capacity,bed_type,bed_count,image_url,has_wifi,breakfast_included,status,housekeeping_status
       FROM rooms WHERE id=$1`,
      [data.room_id],
    )
  ).rows[0];
  if (!room || room.status !== 'available' || !['clean', 'inspected'].includes(room.housekeeping_status) || room.capacity < data.guest_count)
    throw new HttpError(409, 'This room is not available for your party.');
  if (!(await roomAvailable(pool, room.id, data.check_in, data.check_out)))
    throw new HttpError(409, 'This room is no longer available for those dates.');
  if (!account.phone_number || !/^\+63[0-9 ]{9,14}$/.test(account.phone_number))
    throw new HttpError(400, 'Add a Philippine phone number to your profile before booking with the assistant.');
  const billing = (await pool.query('SELECT tax_rate,service_fee_rate FROM hotel_settings WHERE id=1')).rows[0];
  const totals = calculateHotelTotals(Number(room.price_per_night) * nights, Number(billing.tax_rate), Number(billing.service_fee_rate));
  const payload = hotelReservationInput.parse({
    room_id: data.room_id,
    check_in: data.check_in,
    check_out: data.check_out,
    guest_count: data.guest_count,
    contact_name: `${account.first_name} ${account.last_name}`.trim(),
    contact_email: account.email,
    contact_phone: account.phone_number,
    special_requests: data.special_requests,
  });
  const intent = await pool.query(
    `INSERT INTO assistant_confirmation_intents(id,user_id,action,payload,expires_at)
     VALUES($1,$2,'book_room',$3,now()+interval '10 minutes') RETURNING id,expires_at`,
    [randomUUID(), account.id, JSON.stringify(payload)],
  );
  const confirmation = { type: 'booking_confirmation', intent_id: intent.rows[0].id, expires_at: intent.rows[0].expires_at, reservation: {
    reference: 'Pending confirmation', status: 'pending', room_type: room.room_type, room_number: room.room_number,
    check_in: data.check_in, check_out: data.check_out, guest_count: data.guest_count,
    subtotal: totals.subtotal.toFixed(2), tax: totals.tax.toFixed(2), service_fee: totals.serviceFee.toFixed(2), total: totals.total.toFixed(2),
  }} satisfies AssistantCard;
  return { data: confirmation, card: confirmation };
}

async function prepareCancelReservation(args: unknown, user: AssistantUser) {
  const account = customer(user);
  const data = cancelSchema.parse(args);
  const reservation = await prepareCustomerHotelCancellation(pool, data.booking_reference, account.id, data.cancellation_reason);
  const card = { type: 'cancellation_confirmation', intent_id: '', expires_at: '', reservation: reservationCard(reservation), reason: data.cancellation_reason } as const;
  const intent = await pool.query(
    `INSERT INTO assistant_confirmation_intents(user_id,action,payload,expires_at)
     VALUES($1,'cancel_room',$2,now()+interval '10 minutes') RETURNING id,expires_at`,
    [account.id, JSON.stringify({ reservation_id: reservation.id, booking_reference: data.booking_reference, cancellation_reason: data.cancellation_reason })],
  );
  return { data: { ...card, intent_id: intent.rows[0].id, expires_at: intent.rows[0].expires_at }, card: { ...card, intent_id: intent.rows[0].id, expires_at: intent.rows[0].expires_at } satisfies AssistantCard };
}

async function checkReservationStatus(args: unknown, user: AssistantUser) {
  const account = customer(user);
  const data = statusSchema.parse(args);
  if (!data.booking_reference) {
    const result = await pool.query(`${reservationSelect} WHERE r.user_id=$1 AND r.reservation_type='hotel' ORDER BY r.created_at DESC LIMIT 10`, [account.id]);
    const reservations = result.rows.map(reservationCard);
    return { data: { needs_reference: true, reservations }, card: { type: 'reservation_list', reservations } satisfies AssistantCard };
  }
  const reservation = (
    await pool.query(`${reservationSelect} WHERE r.reservation_reference=$1 AND r.user_id=$2 AND r.reservation_type='hotel'`, [data.booking_reference, account.id])
  ).rows[0];
  if (!reservation) throw new HttpError(404, 'I could not find that hotel reservation in your account.');
  const card = { type: 'reservation_status', reservation: reservationCard(reservation) } satisfies AssistantCard;
  return { data: card, card };
}

export async function dispatchAssistantTool(name: string, args: unknown, user: AssistantUser) {
  switch (name) {
    case 'search_available_rooms': return searchAvailableRooms(args);
    case 'prepare_room_reservation': return prepareRoomReservation(args, user);
    case 'prepare_cancel_room_reservation': return prepareCancelReservation(args, user);
    case 'check_reservation_status': return checkReservationStatus(args, user);
    default: throw new HttpError(400, 'That assistant action is not supported.');
  }
}

export async function confirmAssistantIntent(intentId: string, user: Express.Request['user']) {
  const account = customer(user);
  return transaction(async (client) => {
    const intent = (await client.query('SELECT * FROM assistant_confirmation_intents WHERE id=$1 AND user_id=$2 FOR UPDATE', [intentId, account.id])).rows[0];
    if (!intent) throw new HttpError(404, 'Confirmation request not found.');
    if (intent.consumed_at) {
      if (!intent.result_reservation_id) throw new HttpError(409, 'This confirmation request has already been used.');
      const existing = (await client.query(`${reservationSelect} WHERE r.id=$1 AND r.user_id=$2`, [intent.result_reservation_id, account.id])).rows[0];
      if (!existing) throw new HttpError(404, 'The completed reservation is no longer available.');
      return { reservation: existing, already_processed: true, action: intent.action };
    }
    if (new Date(intent.expires_at).getTime() <= Date.now()) throw new HttpError(409, 'This confirmation request has expired. Please start again.');
    if (intent.action === 'book_room') {
      const payload = hotelReservationInput.parse(intent.payload);
      const reservation = await createHotelReservation(client, payload, account);
      await client.query('UPDATE assistant_confirmation_intents SET consumed_at=now(),result_reservation_id=$1 WHERE id=$2', [reservation.id, intent.id]);
      return { reservation, already_processed: false, action: intent.action };
    }
    const payload = z.object({ reservation_id: uuid, booking_reference: text(40).min(1), cancellation_reason: text(1000).min(1) }).parse(intent.payload);
    const { cancelCustomerHotelReservation } = await import('../../reservation-tracking/services/customer-cancellation.js');
    const reservation = await cancelCustomerHotelReservation(client, payload.reservation_id, account.id, payload.cancellation_reason);
    await client.query('UPDATE assistant_confirmation_intents SET consumed_at=now(),result_reservation_id=$1 WHERE id=$2', [reservation.id, intent.id]);
    return { reservation, already_processed: false, action: intent.action };
  });
}
