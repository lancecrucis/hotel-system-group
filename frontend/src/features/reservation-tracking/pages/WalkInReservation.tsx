import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Check, Clock3, UtensilsCrossed, Users } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { Reservation, Room, Settings } from '../../../types/models';
import { ErrorBox, Loading } from '../../../components/ui/common';
import { dateLabel, day, money, nights } from '../../../utils/format';

type BookingType = 'hotel' | 'restaurant';
interface Slot {
  start_time: string;
  end_time: string;
  available: boolean;
  available_seats: number;
  tables: { capacity: number; available: boolean }[];
}

export function WalkInReservation() {
  const navigate = useNavigate();
  const [type, setType] = useState<BookingType>('hotel');
  const [checkIn, setCheckIn] = useState(day());
  const [checkOut, setCheckOut] = useState(day(1));
  const [diningDate, setDiningDate] = useState(day());
  const [guests, setGuests] = useState('2');
  const [roomId, setRoomId] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const roomParams = new URLSearchParams({ check_in: checkIn, check_out: checkOut, guests });
  const rooms = useQuery<{ rooms: Room[]; room_types: string[] }>(`/hotel/rooms?${roomParams}`);
  const diningParams = new URLSearchParams({ date: diningDate, guests });
  const dining = useQuery<{ slots: Slot[]; settings: Settings }>(
    `/restaurant/availability?${diningParams}`,
  );
  const availableRooms = rooms.data?.rooms.filter((room) => room.available) ?? [];
  const selectedRoom = availableRooms.find((room) => room.id === roomId);
  const availableSlots = dining.data?.slots.filter((slot) => slot.available) ?? [];
  const selectedTime = availableSlots.find((slot) => slot.start_time === time);
  const stayNights = Math.max(0, nights(checkIn, checkOut));
  const total = selectedRoom ? Number(selectedRoom.price_per_night) * stayNights : 0;
  const maximumDiningGuests = useMemo(() => {
    const capacities = dining.data?.slots.flatMap((slot) => slot.tables.map((table) => table.capacity)) ?? [];
    return Math.min(
      dining.data?.settings.max_guest_per_booking ?? 10,
      capacities.length ? Math.max(...capacities) : 10,
    );
  }, [dining.data]);

  function switchType(next: BookingType) {
    setType(next);
    setError('');
    setGuests('2');
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const contact = Object.fromEntries(new FormData(e.currentTarget));
    if (type === 'hotel' && !selectedRoom) return setError('Select an available room.');
    if (type === 'restaurant' && !selectedTime) return setError('Select an available dining time.');
    setBusy(true);
    setError('');
    try {
      const payload =
        type === 'hotel'
          ? {
              ...contact,
              walk_in: true,
              room_id: selectedRoom!.id,
              check_in: checkIn,
              check_out: checkOut,
              guest_count: Number(guests),
            }
          : {
              ...contact,
              walk_in: true,
              reservation_date: diningDate,
              start_time: selectedTime!.start_time,
              guest_count: Number(guests),
            };
      const { reservation } = await api<{ reservation: Reservation }>(
        `/${type === 'hotel' ? 'hotel' : 'restaurant'}/reservations`,
        send('POST', payload),
      );
      navigate(`/reservations/${reservation.id}`, { state: { walkInCreated: true } });
    } catch (cause) {
      setError((cause as Error).message);
      if (type === 'hotel') rooms.reload();
      else dining.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-[27px] flex items-end justify-between gap-6 max-[650px]:items-stretch max-[650px]:flex-col">
        <div>
          <h1>New walk-in reservation</h1>
          <p>Enter the guest’s details and confirm their reservation at the front desk.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-[#e8e8e8] bg-[#f0f0f0] p-1" role="group" aria-label="Reservation type">
          <button
            type="button"
            className={`min-h-10 rounded-full border-0 bg-transparent px-4 py-2 text-[#6e6e6e] ${type === 'hotel' ? 'bg-white text-[#1d1d1d] shadow-[0_1px_4px_#00000012]' : ''}`}
            aria-pressed={type === 'hotel'}
            onClick={() => switchType('hotel')}
          >
            <BedDouble size={18} /> Hotel
          </button>
          <button
            type="button"
            className={`min-h-10 rounded-full border-0 bg-transparent px-4 py-2 text-[#6e6e6e] ${type === 'restaurant' ? 'bg-white text-[#1d1d1d] shadow-[0_1px_4px_#00000012]' : ''}`}
            aria-pressed={type === 'restaurant'}
            onClick={() => switchType('restaurant')}
          >
            <UtensilsCrossed size={18} /> Restaurant
          </button>
        </div>
      </header>

      <form className="grid grid-cols-[minmax(0,1fr)_330px] items-start gap-[22px] max-[900px]:grid-cols-1" onSubmit={create}>
        <div className="flex flex-col gap-4">
          <section className="rounded-[16px] border border-[#e8e8e8] bg-white p-6">
            <div className="walk-in-section-title">
              <span>1</span>
              <div>
                <h2>Guest information</h2>
                <p>No customer account is required.</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="full">
                Guest name
                <input name="contact_name" required minLength={2} placeholder="Full name" disabled={busy} />
              </label>
              <label>
                Email
                <input name="contact_email" type="email" required placeholder="guest@example.com" disabled={busy} />
              </label>
              <label>
                Philippine contact number
                <input
                  name="contact_phone"
                  required
                  pattern="\+63[0-9 ]{9,14}"
                  defaultValue="+63 "
                  aria-describedby="walk-in-phone-hint"
                  disabled={busy}
                />
                <small id="walk-in-phone-hint">Use +63 followed by the mobile number.</small>
              </label>
            </div>
          </section>

          <section className="rounded-[16px] border border-[#e8e8e8] bg-white p-6">
            <div className="walk-in-section-title">
              <span>2</span>
              <div>
                <h2>{type === 'hotel' ? 'Stay and room' : 'Dining date and time'}</h2>
                <p>{type === 'hotel' ? 'Only rooms available for the full stay are shown.' : 'Visits last 1 hour with a 30-minute table buffer.'}</p>
              </div>
            </div>
            {type === 'hotel' ? (
              <>
                <div className="walk-in-schedule">
                  <label>
                    Check-in
                    <input type="date" min={day()} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); setRoomId(''); }} disabled={busy} />
                  </label>
                  <label>
                    Check-out
                    <input type="date" min={day(1)} value={checkOut} onChange={(e) => { setCheckOut(e.target.value); setRoomId(''); }} disabled={busy} />
                  </label>
                  <label>
                    Guests
                    <select value={guests} onChange={(e) => { setGuests(e.target.value); setRoomId(''); }} disabled={busy}>
                      {Array.from({ length: 6 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
                    </select>
                  </label>
                </div>
                {rooms.loading ? <Loading /> : <ErrorBox message={rooms.error} />}
                {!rooms.loading && !rooms.error && (
                  <div className="walk-in-room-list" role="radiogroup" aria-label="Available rooms">
                    {availableRooms.map((room) => (
                      <label className={`walk-in-room ${roomId === room.id ? 'selected' : ''}`} key={room.id}>
                        <input type="radio" name="selected-room" value={room.id} checked={roomId === room.id} onChange={() => setRoomId(room.id)} />
                        <span className="walk-in-room-number">{room.room_number}</span>
                        <span><strong>{room.room_type}</strong><small>{room.bed_count} {room.bed_type} · up to {room.capacity}</small></span>
                        <strong>{money(room.price_per_night)}<small>/night</small></strong>
                        {roomId === room.id && <Check size={18} />}
                      </label>
                    ))}
                    {!availableRooms.length && <p className="muted">No rooms are available for these dates and guest count.</p>}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="walk-in-schedule restaurant">
                  <label>
                    Dining date
                    <input type="date" min={day()} value={diningDate} onChange={(e) => { setDiningDate(e.target.value); setTime(''); }} disabled={busy} />
                  </label>
                  <label>
                    Guests
                    <select value={guests} onChange={(e) => { setGuests(e.target.value); setTime(''); }} disabled={busy}>
                      {Array.from({ length: maximumDiningGuests }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
                    </select>
                  </label>
                </div>
                {dining.loading ? <Loading /> : <ErrorBox message={dining.error} />}
                {!dining.loading && !dining.error && (
                  <div className="walk-in-times" role="radiogroup" aria-label="Available dining times">
                    {availableSlots.map((slot) => (
                      <label className={time === slot.start_time ? 'selected' : ''} key={slot.start_time}>
                        <input type="radio" name="selected-time" value={slot.start_time} checked={time === slot.start_time} onChange={() => setTime(slot.start_time)} />
                        <Clock3 size={16} />
                        <strong>{slot.start_time.slice(0, 5)}</strong>
                        <small>until {slot.end_time.slice(0, 5)}</small>
                      </label>
                    ))}
                    {!availableSlots.length && <p className="muted">No dining times are available for this date and party size.</p>}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-[16px] border border-[#e8e8e8] bg-white p-6">
            <div className="walk-in-section-title">
              <span>3</span>
              <div>
                <h2>Special requests</h2>
                <p>Optional notes for the service team.</p>
              </div>
            </div>
            <label>
              <span className="sr-only">Special requests</span>
              <textarea name="special_requests" rows={3} placeholder="Accessibility needs, arrival notes, dietary requests…" disabled={busy} />
            </label>
          </section>
        </div>

        <aside className="sticky top-[168px] rounded-[16px] border border-[#e8e8e8] bg-white p-6 max-[900px]:static">
          <h2>Reservation summary</h2>
          <div className="walk-in-summary-type">
            {type === 'hotel' ? <BedDouble size={20} /> : <UtensilsCrossed size={20} />}
            <strong>{type === 'hotel' ? 'Hotel stay' : 'Restaurant table'}</strong>
          </div>
          <dl>
            {type === 'hotel' ? (
              <>
                <div><dt>Dates</dt><dd>{dateLabel(checkIn)} – {dateLabel(checkOut)}</dd></div>
                <div><dt>Room</dt><dd>{selectedRoom ? `${selectedRoom.room_type} · ${selectedRoom.room_number}` : 'Select a room'}</dd></div>
                <div><dt>Stay</dt><dd>{stayNights} {stayNights === 1 ? 'night' : 'nights'}</dd></div>
                <div className="walk-in-total"><dt>Total</dt><dd>{money(total)}</dd></div>
              </>
            ) : (
              <>
                <div><dt>Date</dt><dd>{dateLabel(diningDate)}</dd></div>
                <div><dt>Time</dt><dd>{selectedTime ? `${selectedTime.start_time.slice(0, 5)} – ${selectedTime.end_time.slice(0, 5)}` : 'Select a time'}</dd></div>
                <div><dt>Guests</dt><dd>{guests}</dd></div>
                <div className="walk-in-total"><dt>Charge</dt><dd>Meal billed at restaurant</dd></div>
              </>
            )}
          </dl>
          <div className="walk-in-confirm-note"><Check size={16} /><span>This walk-in will be confirmed immediately.</span></div>
          <ErrorBox message={error} />
          <button className="full-width" disabled={busy || (type === 'hotel' ? !selectedRoom : !selectedTime)}>
            {busy ? 'Creating reservation…' : 'Create confirmed reservation'}
          </button>
          <p className="walk-in-audit-note"><Users size={14} /> Your staff account will be recorded as the creator.</p>
        </aside>
      </form>
    </div>
  );
}
