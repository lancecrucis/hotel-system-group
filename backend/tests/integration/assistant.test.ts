import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { ChatCompletion } from 'openai/resources/chat/completions';
import { pool } from '../../src/config/database.js';
import { confirmAssistantIntent, dispatchAssistantTool } from '../../src/modules/assistant/services/tools.js';
import { runAssistant } from '../../src/modules/assistant/services/agent.js';

const user = (id: string): NonNullable<Express.Request['user']> => ({
  id,
  role: 'customer',
  first_name: 'Assistant',
  last_name: 'Tester',
  email: `assistant-${id}@example.com`,
  phone_number: '+63 917 123 4567',
  date_of_birth: null,
  profile_image: null,
});

function choice(message: Record<string, unknown>) {
  return { index: 0, finish_reason: 'stop', message } as unknown as ChatCompletion.Choice;
}

test('assistant agent refuses unsupported tool calls and does not invent actions', async () => {
  let calls = 0;
  const result = await runAssistant({
    message: 'Reserve a restaurant table for tonight.',
    history: [],
    user: undefined,
    complete: async () => {
      calls += 1;
      if (calls === 1)
        return choice({ role: 'assistant', content: null, tool_calls: [{ id: 'bad', type: 'function', function: { name: 'reserve_table', arguments: '{}' } }] });
      return choice({ role: 'assistant', content: 'I can only help with hotel room reservations.' });
    },
  });
  assert.equal(result.reply, 'I can only help with hotel room reservations.');
  assert.equal(result.cards.length, 0);
  assert.equal(calls, 2);
});

test('assistant validates date and guest limits before querying availability', async () => {
  await assert.rejects(
    dispatchAssistantTool('search_available_rooms', { check_in: 'not-a-date', check_out: '2099-01-02', guest_count: 2 }, undefined),
  );
  await assert.rejects(
    dispatchAssistantTool('search_available_rooms', { check_in: '2099-01-01', check_out: '2099-01-02', guest_count: 7 }, undefined),
  );
});

test('assistant confirmation intents enforce expiry, ownership, and replay safety', async (context) => {
  const ownerId = randomUUID();
  const otherId = randomUUID();
  const roomNumber = `AI-${randomUUID().slice(0, 8)}`;
  const reservationReference = `HTL-AI-${randomUUID().slice(0, 8).toUpperCase()}`;
  let roomId = '';
  let reservationId = '';
  const createdReservationIds: string[] = [];
  const intentIds: string[] = [];
  await pool.query(
    `INSERT INTO users(id,first_name,last_name,email,password_hash,phone_number) VALUES($1,'Assistant','Owner',$2,'test-hash','+63 917 123 4567'),($3,'Assistant','Other',$4,'test-hash','+63 917 123 4567')`,
    [ownerId, `assistant-owner-${ownerId}@example.com`, otherId, `assistant-other-${otherId}@example.com`],
  );
  roomId = (await pool.query(
    `INSERT INTO rooms(room_number,room_type,description,price_per_night,capacity,bed_type,bed_count,status,housekeeping_status) VALUES($1,'Assistant Suite','Test room',1000,2,'Queen',1,'available','clean') RETURNING id`,
    [roomNumber],
  )).rows[0].id;
  reservationId = (await pool.query(
    `INSERT INTO reservations(id,user_id,created_by,booking_source,reservation_type,status,subtotal_amount,tax_amount,service_fee_amount,total_amount,contact_name,contact_email,contact_phone,reservation_reference)
     VALUES($1,$2,$2,'online','hotel','confirmed',1000,120,100,1220,'Assistant Owner',$3,'+63 917 123 4567',$4) RETURNING id`,
    [randomUUID(), ownerId, `assistant-owner-${ownerId}@example.com`, reservationReference],
  )).rows[0].id;
  await pool.query(
    `INSERT INTO hotel_reservations(reservation_id,room_id,check_in,check_out,guest_count,price_per_night) VALUES($1,$2,'2099-01-01','2099-01-02',2,1000)`,
    [reservationId, roomId],
  );
  const expiredId = randomUUID();
  intentIds.push(expiredId);
  await pool.query(
    `INSERT INTO assistant_confirmation_intents(id,user_id,action,payload,expires_at) VALUES($1,$2,'book_room',$3,now()-interval '1 minute')`,
    [expiredId, ownerId, JSON.stringify({})],
  );
  await assert.rejects(confirmAssistantIntent(expiredId, user(ownerId)), /expired/i);

  const prepared = await dispatchAssistantTool('prepare_room_reservation', {
    room_id: roomId,
    check_in: '2099-02-01',
    check_out: '2099-02-03',
    guest_count: 2,
    special_requests: 'Late arrival',
  }, user(ownerId));
  assert.equal(prepared.card?.type, 'booking_confirmation');
  const preparedIntentId = (prepared.card as { intent_id: string }).intent_id;
  intentIds.push(preparedIntentId);
  const confirmed = await confirmAssistantIntent(preparedIntentId, user(ownerId));
  createdReservationIds.push(confirmed.reservation.id);
  assert.equal(confirmed.action, 'book_room');
  assert.match(confirmed.reservation.reservation_reference, /^HTL-/);
  await assert.rejects(
    dispatchAssistantTool('prepare_room_reservation', {
      room_id: roomId,
      check_in: '2099-02-01',
      check_out: '2099-02-03',
      guest_count: 2,
    }, user(ownerId)),
    /no longer available/i,
  );

  const replayId = randomUUID();
  intentIds.push(replayId);
  await pool.query(
    `INSERT INTO assistant_confirmation_intents(id,user_id,action,payload,expires_at,consumed_at,result_reservation_id) VALUES($1,$2,'book_room',$3,now()+interval '10 minutes',now(),$4)`,
    [replayId, ownerId, JSON.stringify({}), reservationId],
  );
  const replay = await confirmAssistantIntent(replayId, user(ownerId));
  assert.equal(replay.already_processed, true);
  assert.equal(replay.reservation.reservation_reference, reservationReference);
  await assert.rejects(confirmAssistantIntent(replayId, user(otherId)), /not found/i);

  context.after(async () => {
    await pool.query('DELETE FROM assistant_confirmation_intents WHERE id=ANY($1::uuid[]) OR user_id=ANY($2::uuid[])', [intentIds, [ownerId, otherId]]);
    await pool.query('DELETE FROM notifications WHERE reservation_id=ANY($1::uuid[])', [[reservationId, ...createdReservationIds]]);
    if (createdReservationIds.length) await pool.query('DELETE FROM reservations WHERE id=ANY($1::uuid[])', [createdReservationIds]);
    await pool.query('DELETE FROM reservations WHERE id=$1', [reservationId]);
    await pool.query('DELETE FROM rooms WHERE id=$1', [roomId]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[ownerId, otherId]]);
  });
});
