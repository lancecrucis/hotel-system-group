import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { Settings, Reservation } from '../../../types/models';
import { ErrorBox } from '../../../components/ui/common';
import { ContactFields } from '../../hotel-reservations/components/ContactFields';
import { day } from '../../../utils/format';

interface Slot {
  start_time: string;
  end_time: string;
  available: boolean;
  tables: { capacity: number; available: boolean }[];
}

function displayTime(time: string) {
  const [hourText, minute] = time.slice(0, 5).split(':');
  const hour = Number(hourText);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

function startTimes(opening: string, closing: string) {
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const toTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const lastStart = toMinutes(closing) - 60;
  const options: string[] = [];
  for (let value = toMinutes(opening); value <= lastStart; value += 30) options.push(toTime(value));
  return options;
}

export function Dining() {
  const [date, setDate] = useState(day(1));
  const [guests, setGuests] = useState('2');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  const [availability, setAvailability] = useState<{ slots: Slot[]; settings: Settings } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const restaurantSettings = useQuery<{ settings: Settings }>('/restaurant/settings');
  const slot = availability?.slots.find((item) => item.start_time === time);
  const timeUnavailable = searched && Boolean(availability) && !slot?.available;
  const maximumSeats = Math.max(0, ...(availability?.slots[0]?.tables.map((table) => table.capacity) ?? []));
  const maxGuests = Math.min(availability?.settings.max_guest_per_booking ?? 10, maximumSeats || 10);
  const guestCount = Number(guests) || 0;

  function clearAvailability() {
    setAvailability(null);
    setSearched(false);
    setSearchError('');
    setError('');
  }

  async function checkAvailability() {
    setChecking(true);
    setAvailability(null);
    setSearched(false);
    setSearchError('');
    setError('');
    try {
      const result = await api<{ slots: Slot[]; settings: Settings }>(
        `/restaurant/availability?${new URLSearchParams({ date, guests, time })}`,
      );
      setAvailability(result);
      setSearched(true);
    } catch (e) {
      setAvailability(null);
      setSearched(true);
      setSearchError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }

  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot?.available || !date || !guests) {
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
      setAvailability(null);
      setSearched(false);
      setTime('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#f9f3e7]">
      <div className="mb-6 h-[190px] overflow-hidden border border-[#c8a783] bg-[#ead5b8] max-[500px]:h-[140px]">
        <img className="block h-full w-full object-cover object-[center_53%]" src="/images/restaurant.webp" alt="Hotel restaurant dining room" />
      </div>
      <div className="mx-auto mb-5 flex max-w-[820px] items-baseline justify-between gap-4 max-[500px]:items-start max-[500px]:flex-col">
        <h1 className="m-0 font-['Gelasio'] text-[32px] font-normal leading-[1.15] tracking-[-.5px] text-[#441901]">Reserve a table</h1>
        <span className="font-serif text-sm text-[#70462c]">1-hour dining · 30-minute table reset</span>
      </div>
      <form className="mx-auto max-w-[820px] border border-[#c8a783] bg-[#fff8ee] p-[26px] max-[500px]:p-[19px]" onSubmit={book}>
        <div className="grid grid-cols-3 gap-[18px] max-[700px]:grid-cols-2 max-[500px]:grid-cols-1">
          <label className="flex flex-col gap-[7px] font-serif text-sm text-[#54220e]">
            Dining date
            <input
              className="!min-h-[44px] !rounded-[10px] !border !border-[#b99673] !bg-transparent !px-4 !py-2 !font-sans !text-sm text-[#54220e] focus:!border-[#642c14] focus:!outline-none focus:!ring-2 focus:!ring-[#642c14]/20"
              type="date"
              required
              min={day()}
              value={date}
              disabled={busy || checking}
              onChange={(e) => {
                setDate(e.target.value);
                clearAvailability();
              }}
            />
          </label>
          <label className="flex flex-col gap-[7px] font-serif text-sm text-[#54220e]">
            Guests
            <input
              className="!min-h-[44px] !rounded-[10px] !border !border-[#b99673] !bg-transparent !px-4 !py-2 !font-sans !text-sm text-[#54220e] focus:!border-[#642c14] focus:!outline-none focus:!ring-2 focus:!ring-[#642c14]/20"
              type="number"
              required
              min={1}
              max={maxGuests}
              value={guests}
              disabled={busy || checking}
              onChange={(e) => {
                setGuests(e.target.value);
                clearAvailability();
              }}
            />
          </label>
          <label className="flex flex-col gap-[7px] font-serif text-sm text-[#54220e] max-[700px]:col-span-full">
            Preferred time
            <select
              className={`!min-h-[44px] !rounded-[10px] !border !px-4 !py-2 !font-sans !text-sm focus:!outline-none focus:!ring-2 ${timeUnavailable ? '!border-[#b42318] !bg-[#fff1f0] !text-[#8f1d14] focus:!border-[#b42318] focus:!ring-[#b42318]/20' : '!border-[#b99673] !bg-transparent !text-[#54220e] focus:!border-[#642c14] focus:!ring-[#642c14]/20'}`}
              required
              value={time}
              aria-invalid={timeUnavailable}
              aria-describedby={timeUnavailable ? 'dining-time-error' : 'dining-time-help'}
              disabled={busy || checking || restaurantSettings.loading || !restaurantSettings.data}
              onChange={(e) => {
                setTime(e.target.value);
                clearAvailability();
              }}
            >
              <option value="" disabled>Choose a time</option>
              {restaurantSettings.data && startTimes(restaurantSettings.data.settings.opening_time, restaurantSettings.data.settings.closing_time).map((option) => (
                <option key={option} value={option}>{displayTime(option)} ({option})</option>
              ))}
            </select>
            {timeUnavailable ? (
              <span id="dining-time-error" className="font-sans text-xs font-medium text-[#b42318]" role="alert">
                Fully booked at {displayTime(time)} ({time}). Choose another time, then check again.
              </span>
            ) : (
              <span id="dining-time-help" className="font-sans text-xs text-[#7d746b]">Times are offered every 30 minutes.</span>
            )}
          </label>
        </div>
        {restaurantSettings.error && <ErrorBox message={restaurantSettings.error} />}
        <button
          type="button"
          className="mt-5 min-h-11 w-full rounded-[9px] border-0 bg-[#642c14] px-4 py-2 font-['Crimson_Text'] text-xl font-bold text-[#fff8ed] hover:bg-[#54220e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#642c14] disabled:cursor-wait disabled:bg-[#bba896]"
          onClick={() => void checkAvailability()}
          disabled={checking || busy || restaurantSettings.loading || !date || !guests || !time}
        >
          {checking ? 'Checking availability…' : 'Show available times'}
        </button>
        {searchError && <ErrorBox message={searchError} />}
        {searched && availability && slot?.available && (
          <div className="mt-5 rounded-xl border border-[#c9d9ca] bg-[#f2f8f2] p-4" role="status" aria-live="polite">
            <p className="m-0 font-sans text-sm font-semibold text-[#315d3a]">A table is available</p>
            <p className="mb-0 mt-1 font-sans text-sm text-[#425748]">
              {slot.tables.filter((table) => table.available && table.capacity >= guestCount).length} suitable tables for {guestCount} {guestCount === 1 ? 'guest' : 'guests'} on {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {displayTime(time)} ({time}). Dining ends at {displayTime(slot.end_time)} ({slot.end_time.slice(0, 5)}).
            </p>
          </div>
        )}
        {searched && availability && !slot?.available && (
          <div className="mt-5 rounded-xl border border-[#e6aaa5] bg-[#fff1f0] p-4 text-sm text-[#8f1d14]" role="alert" aria-live="polite">
            {slot ? `No table is available for ${guestCount} ${guestCount === 1 ? 'guest' : 'guests'} at ${displayTime(time)} (${time}). You can’t reserve this time; choose another time and check again.` : 'That time is not an available reservation slot. Choose a time on the hour or half-hour during opening hours.'}
          </div>
        )}
        <ErrorBox message={error} />
        {user && slot?.available ? (
          <>
            <div className="my-7 border-t border-[#d8bfa0]" />
            <h2 className="mb-[18px] font-['Gelasio'] text-[22px] font-normal text-[#441901]">Contact details</h2>
            <div className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1">
              <ContactFields />
            </div>
            <div className="mt-6 flex flex-col items-stretch gap-3">
              <span className="text-xs text-[#70462c]">Your reservation is confirmed when you book.</span>
              <button className="min-h-11 w-full rounded-[9px] border-0 bg-[#642c14] px-4 py-2 font-['Crimson_Text'] text-xl font-bold text-[#fff8ed] hover:bg-[#54220e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#642c14] disabled:cursor-not-allowed disabled:bg-[#bba896]" disabled={busy || !slot?.available || !date || !guests}>
                {busy ? 'Booking your table…' : 'Reserve table'}
              </button>
            </div>
          </>
        ) : !user && slot?.available ? (
          <div className="mt-6 flex items-center justify-between gap-4">
            <Link className="inline-flex min-h-11 items-center justify-center border border-[#642c14] bg-[#642c14] px-[21px] py-[11px] font-serif font-bold text-[#fff8ee] no-underline hover:bg-[#54220e]" to="/login" state={{ from: '/dining' }}>
              Sign in to reserve
            </Link>
          </div>
        ) : null}
      </form>
    </div>
  );
}
