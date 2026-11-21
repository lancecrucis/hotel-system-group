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
    <div className="mx-auto max-w-[1160px]">
      <header className="mb-8 flex items-end justify-between gap-6 max-[650px]:items-stretch max-[650px]:flex-col">
        <div>
          <p className="mb-2 text-sm font-medium text-[#98785b]">Front desk</p>
          <h1 className="m-0 font-['Gelasio'] text-[34px] font-normal leading-tight tracking-[-.03em] text-[#441901] max-[650px]:text-[29px]">New walk-in reservation</h1>
          <p className="mb-0 mt-2 max-w-[540px] text-sm leading-relaxed text-[#806348]">Enter the guest’s details and confirm their reservation at the front desk.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-[#d8bfa0] bg-[#f3e1c7] p-1 max-[650px]:w-full" role="group" aria-label="Reservation type">
          <button
            type="button"
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border-0 bg-transparent px-4 py-2 text-sm font-semibold text-[#70462c] transition-colors ${type === 'hotel' ? 'bg-[#642c14] text-white shadow-sm' : 'hover:bg-[#ead5b8]'}`}
            aria-pressed={type === 'hotel'}
            onClick={() => switchType('hotel')}
          >
            <BedDouble size={18} aria-hidden="true" /> Hotel
          </button>
          <button
            type="button"
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border-0 bg-transparent px-4 py-2 text-sm font-semibold text-[#70462c] transition-colors ${type === 'restaurant' ? 'bg-[#642c14] text-white shadow-sm' : 'hover:bg-[#ead5b8]'}`}
            aria-pressed={type === 'restaurant'}
            onClick={() => switchType('restaurant')}
          >
            <UtensilsCrossed size={18} aria-hidden="true" /> Restaurant
          </button>
        </div>
      </header>

      <form className="grid grid-cols-[minmax(0,1fr)_330px] items-start gap-[22px] max-[900px]:grid-cols-1" onSubmit={create}>
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-6 shadow-[0_8px_24px_rgba(84,34,14,.055)] max-[500px]:p-4">
            <div className="mb-5 flex items-start gap-[13px]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f3e1c7] text-sm font-semibold text-[#642c14]">1</span>
              <div>
                <h2 className="m-0 !font-sans text-lg !font-semibold text-[#54220e]">Guest information</h2>
                <p className="mb-0 mt-1 text-sm text-[#806348]">No customer account is required.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[18px] max-[650px]:grid-cols-1">
              <label className="col-span-full gap-1.5 text-sm font-semibold text-[#70462c] max-[650px]:col-span-auto">
                Guest name
                <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" name="contact_name" required minLength={2} placeholder="Full name" disabled={busy} />
              </label>
              <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                Email
                <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" name="contact_email" type="email" required placeholder="guest@example.com" disabled={busy} />
              </label>
              <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                Philippine contact number
                <input
                  className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15"
                  name="contact_phone"
                  required
                  pattern="\+63[0-9 ]{9,14}"
                  defaultValue="+63 "
                  aria-describedby="walk-in-phone-hint"
                  disabled={busy}
                />
                <small className="text-xs font-normal text-[#806348]" id="walk-in-phone-hint">Use +63 followed by the mobile number.</small>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-6 shadow-[0_8px_24px_rgba(84,34,14,.055)] max-[500px]:p-4">
            <div className="mb-5 flex items-start gap-[13px]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f3e1c7] text-sm font-semibold text-[#642c14]">2</span>
              <div>
                <h2 className="m-0 !font-sans text-lg !font-semibold text-[#54220e]">{type === 'hotel' ? 'Stay and room' : 'Dining date and time'}</h2>
                <p className="mb-0 mt-1 text-sm text-[#806348]">{type === 'hotel' ? 'Only rooms available for the full stay are shown.' : 'Visits last 1 hour with a 30-minute table buffer.'}</p>
              </div>
            </div>
            {type === 'hotel' ? (
              <>
                <div className="grid grid-cols-[1fr_1fr_.7fr] gap-3 mb-[18px] max-[650px]:grid-cols-1">
                  <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                    Check-in
                    <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="date" min={day()} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); setRoomId(''); }} disabled={busy} />
                  </label>
                  <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                    Check-out
                    <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="date" min={day(1)} value={checkOut} onChange={(e) => { setCheckOut(e.target.value); setRoomId(''); }} disabled={busy} />
                  </label>
                  <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                    Guests
                    <select className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" value={guests} onChange={(e) => { setGuests(e.target.value); setRoomId(''); }} disabled={busy}>
                      {Array.from({ length: 6 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
                    </select>
                  </label>
                </div>
                {rooms.loading ? <Loading /> : <ErrorBox message={rooms.error} />}
                {!rooms.loading && !rooms.error && (
                  <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1" role="radiogroup" aria-label="Available rooms">
                    {availableRooms.map((room) => (
                      <label className={`flex min-h-[190px] cursor-pointer flex-col rounded-2xl border p-4 transition-colors ${roomId === room.id ? 'border-[#642c14] bg-[#f1dfc8] shadow-[inset_0_0_0_1px_#642c14]' : 'border-[#d8bfa0] bg-[#fffdf8] hover:border-[#b99673]'}`} key={room.id}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="grid h-10 min-w-11 place-items-center rounded-lg bg-[#ead5b8] px-2 text-xs font-bold text-[#54220e]">{room.room_number}</span>
                          <input className="mt-1 accent-[#642c14]" type="radio" name="selected-room" value={room.id} checked={roomId === room.id} onChange={() => setRoomId(room.id)} />
                        </div>
                        <span className="mt-4 min-w-0"><strong className="block truncate text-sm text-[#54220e]">{room.room_type}</strong><small className="mt-1 block text-xs text-[#806348]">{room.bed_count} {room.bed_type} · up to {room.capacity} guests</small></span>
                        <span className="mt-auto flex items-end justify-between gap-2 pt-5"><strong className="text-sm text-[#54220e]">{money(room.price_per_night)}<small className="mt-1 block text-xs font-normal text-[#806348]">per night</small></strong>{roomId === room.id && <Check className="text-[#642c14]" size={18} aria-hidden="true" />}</span>
                      </label>
                    ))}
                    {!availableRooms.length && <p className="text-[#70462c]">No rooms are available for these dates and guest count.</p>}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-[18px] grid max-w-[520px] grid-cols-2 gap-3 max-[650px]:max-w-none max-[650px]:grid-cols-1">
                  <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                    Dining date
                    <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="date" min={day()} value={diningDate} onChange={(e) => { setDiningDate(e.target.value); setTime(''); }} disabled={busy} />
                  </label>
                  <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                    Guests
                    <select className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" value={guests} onChange={(e) => { setGuests(e.target.value); setTime(''); }} disabled={busy}>
                      {Array.from({ length: maximumDiningGuests }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
                    </select>
                  </label>
                </div>
                {dining.loading ? <Loading /> : <ErrorBox message={dining.error} />}
                {!dining.loading && !dining.error && (
                  <div className="grid grid-cols-4 gap-2 max-[650px]:grid-cols-2" role="radiogroup" aria-label="Available dining times">
                    {availableSlots.map((slot) => (
                      <label className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-3 text-center transition-colors ${time === slot.start_time ? 'border-[#642c14] bg-[#642c14] text-white' : 'border-[#d8bfa0] bg-[#fffdf8] text-[#70462c] hover:border-[#b99673]'}`} key={slot.start_time}>
                        <input className="accent-[#642c14]" type="radio" name="selected-time" value={slot.start_time} checked={time === slot.start_time} onChange={() => setTime(slot.start_time)} />
                        <Clock3 size={16} aria-hidden="true" />
                        <strong>{slot.start_time.slice(0, 5)}</strong>
                        <small>until {slot.end_time.slice(0, 5)}</small>
                      </label>
                    ))}
                    {!availableSlots.length && <p className="text-[#70462c]">No dining times are available for this date and party size.</p>}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-6 shadow-[0_8px_24px_rgba(84,34,14,.055)] max-[500px]:p-4">
            <div className="mb-5 flex items-start gap-[13px]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f3e1c7] text-sm font-semibold text-[#642c14]">3</span>
              <div>
                <h2 className="m-0 !font-sans text-lg !font-semibold text-[#54220e]">Special requests</h2>
                <p className="mb-0 mt-1 text-sm text-[#806348]">Optional notes for the service team.</p>
              </div>
            </div>
            <label>
              <span className="sr-only">Special requests</span>
              <textarea className="!min-h-24 !rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" name="special_requests" rows={3} placeholder="Accessibility needs, arrival notes, dietary requests…" disabled={busy} />
            </label>
          </section>
        </div>

        <aside className="sticky top-[168px] rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] p-6 shadow-[0_12px_32px_rgba(84,34,14,.08)] max-[900px]:static max-[500px]:p-4">
          <p className="mb-1 text-sm font-medium text-[#98785b]">Ready to confirm</p>
          <h2 className="m-0 !font-sans text-xl !font-semibold text-[#54220e]">Reservation summary</h2>
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-[#54220e] p-3.5 text-[#fff8ee]">
            {type === 'hotel' ? <BedDouble size={20} aria-hidden="true" /> : <UtensilsCrossed size={20} aria-hidden="true" />}
            <strong>{type === 'hotel' ? 'Hotel stay' : 'Restaurant table'}</strong>
          </div>
          <dl className="mt-3">
            {type === 'hotel' ? (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] py-3 text-sm"><dt className="text-[#806348]">Dates</dt><dd className="text-right text-[#54220e]">{dateLabel(checkIn)} – {dateLabel(checkOut)}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] py-3 text-sm"><dt className="text-[#806348]">Room</dt><dd className="max-w-[210px] text-right text-[#54220e]">{selectedRoom ? `${selectedRoom.room_type} · ${selectedRoom.room_number}` : 'Select a room'}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] py-3 text-sm"><dt className="text-[#806348]">Stay</dt><dd className="text-right text-[#54220e]">{stayNights} {stayNights === 1 ? 'night' : 'nights'}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b-0 pt-4 text-sm font-semibold"><dt className="text-[#54220e]">Total</dt><dd className="font-['Gelasio'] text-xl font-normal text-[#441901]">{money(total)}</dd></div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] py-3 text-sm"><dt className="text-[#806348]">Date</dt><dd className="text-right text-[#54220e]">{dateLabel(diningDate)}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] py-3 text-sm"><dt className="text-[#806348]">Time</dt><dd className="text-right text-[#54220e]">{selectedTime ? `${selectedTime.start_time.slice(0, 5)} – ${selectedTime.end_time.slice(0, 5)}` : 'Select a time'}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] py-3 text-sm"><dt className="text-[#806348]">Guests</dt><dd className="text-right text-[#54220e]">{guests}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b-0 pt-4 text-sm font-semibold"><dt className="text-[#54220e]">Charge</dt><dd className="max-w-[180px] text-right font-normal text-[#70462c]">Meal billed at restaurant</dd></div>
              </>
            )}
          </dl>
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-dashed border-[#a87652] bg-[#f7e8d2] p-3 text-xs text-[#54220e]"><Check size={16} aria-hidden="true" /><span>This walk-in will be confirmed immediately.</span></div>
          <ErrorBox message={error} />
          <button className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 font-sans text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || (type === 'hotel' ? !selectedRoom : !selectedTime)}>
            {busy ? 'Creating reservation…' : 'Create confirmed reservation'}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-[#70462c]"><Users size={14} aria-hidden="true" /> Your staff account will be recorded as the creator.</p>
        </aside>
      </form>
    </div>
  );
}
