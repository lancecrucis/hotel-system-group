import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { Settings, Reservation } from '../../../types/models';
import { ErrorBox, Loading } from '../../../components/ui/common';
import { ContactFields } from '../../hotel-reservations/components/ContactFields';
import { day } from '../../../utils/format';

interface Slot {
  start_time: string;
  end_time: string;
  available: boolean;
  tables: { capacity: number; available: boolean }[];
}

export function Dining() {
  const [date, setDate] = useState(day(1));
  const [guests, setGuests] = useState('2');
  const [time, setTime] = useState('18:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useQuery<{ slots: Slot[]; settings: Settings }>(
    `/restaurant/availability?${new URLSearchParams({ date: date || day(), guests: guests || '2' })}`,
  );
  const slot =
    query.data?.slots.find((item) => item.start_time === time) ??
    query.data?.slots.find((item) => item.available) ??
    query.data?.slots[0];
  const maximumSeats = Math.max(0, ...(query.data?.slots[0]?.tables.map((table) => table.capacity) ?? []));
  const maxGuests = Math.min(query.data?.settings.max_guest_per_booking ?? 10, maximumSeats || 10);
  const guestCount = Number(guests) || 0;
  const slotStatus = (item: Slot) => {
    const fittingTables = item.tables.filter((table) => table.capacity >= guestCount);
    const availableTables = fittingTables.filter((table) => table.available).length;
    if (!fittingTables.length) return { tone: 'fit', label: 'No table fits' };
    if (!availableTables) return { tone: 'full', label: 'Fully booked' };
    if (availableTables <= 2)
      return {
        tone: 'limited',
        label: `${availableTables} ${availableTables === 1 ? 'table' : 'tables'} left`,
      };
    return { tone: 'open', label: `${availableTables} tables left` };
  };

  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (query.loading || !slot?.available || !date || !guests) {
      setError('No tables are available for this date, time, and party size.');
      return;
    }
    const contact = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const { reservation } = await api<{ reservation: Reservation }>(
        '/restaurant/reservations',
        send('POST', {
          ...contact,
          reservation_date: date,
          start_time: slot.start_time,
          guest_count: Number(guests),
        }),
      );
      navigate(`/reservations/${reservation.id}`);
    } catch (e) {
      setError((e as Error).message);
      query.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-6 h-[190px] overflow-hidden rounded-[20px] border border-[#e8e8e8] bg-[#f0f0f0] max-[500px]:h-[140px]">
        <img className="block h-full w-full object-cover object-[center_53%]" src="/images/restaurant.webp" alt="Hotel restaurant dining room" />
      </div>
      <div className="mx-auto mb-5 flex max-w-[820px] items-baseline justify-between gap-4 max-[500px]:items-start max-[500px]:flex-col">
        <h1 className="m-0 text-[32px] font-semibold leading-[1.15] tracking-[-1px]">Reserve a table</h1>
        <span className="text-xs text-[#6e6e6e]">1-hour visit · 30 minutes between bookings</span>
      </div>
      <form className="mx-auto max-w-[820px] rounded-[20px] border border-[#e8e8e8] bg-white p-[26px] max-[500px]:p-[19px]" onSubmit={book}>
        <div className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1">
          <label>
            Dining date
            <input
              type="date"
              required
              min={day()}
              value={date}
              disabled={busy}
              onChange={(e) => {
                setDate(e.target.value);
                setError('');
              }}
            />
          </label>
          <label>
            Guests
            <input
              type="number"
              required
              min={1}
              max={maxGuests}
              value={guests}
              disabled={busy}
              onChange={(e) => {
                setGuests(e.target.value);
                setError('');
              }}
            />
          </label>
        </div>
        <fieldset className="mt-[26px] min-w-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[13px] font-semibold">Dining time</legend>
          <div className="grid grid-cols-4 gap-2.5 max-[500px]:grid-cols-2">
            {query.data?.slots.map((item) => {
              const status = slotStatus(item);
              const disabled = status.tone === 'fit' || status.tone === 'full';
              return (
                <label className={`relative flex min-h-[92px] cursor-pointer flex-col items-start gap-0.5 rounded-[14px] border px-3.5 py-[13px] transition ${status.tone === 'fit' || status.tone === 'full' ? 'cursor-not-allowed bg-[#f4f4f4] text-[#969696]' : 'bg-white hover:border-[#777]'} ${time === item.start_time ? 'border-[#161616] shadow-[0_0_0_2px_#161616_inset]' : 'border-[#dedede]'}`} key={item.start_time}>
                  <input
                    type="radio"
                    name="dining-time"
                    value={item.start_time}
                    checked={time === item.start_time}
                    disabled={busy || disabled}
                    onChange={(e) => {
                      setTime(e.target.value);
                      setError('');
                    }}
                  />
                  <span className="text-[17px] font-semibold tracking-[-.3px]">{item.start_time.slice(0, 5)}</span>
                  <span className="text-[11px]">until {item.end_time.slice(0, 5)}</span>
                  <span className="mt-auto text-[11px] text-[#606060]">{status.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {query.loading ? <Loading /> : <ErrorBox message={query.error} />}
        {!query.loading && !query.error && !slot && <ErrorBox message="No dining times available." />}
        {!query.loading && slot && !slot.available && (
          <ErrorBox
            message={
              Number(guests) > maxGuests
                ? 'No table fits this party size.'
                : 'No tables available at this time.'
            }
          />
        )}
        <ErrorBox message={error} />
        {user ? (
          <>
            <div className="my-7 border-t border-[#e8e8e8]" />
            <h2 className="mb-[18px] text-[17px] font-semibold">Contact details</h2>
            <div className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1">
              <ContactFields />
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 max-[500px]:items-start max-[500px]:flex-col">
              <span className="text-xs text-[#6e6e6e]">Confirm within 15 minutes.</span>
              <button disabled={busy || query.loading || !slot?.available || !date || !guests}>
                {busy ? 'Holding your time…' : 'Continue to confirmation'}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 flex items-center justify-between gap-4">
            <Link className="button" to="/login" state={{ from: '/dining' }}>
              Sign in to reserve
            </Link>
          </div>
        )}
      </form>
    </>
  );
}
