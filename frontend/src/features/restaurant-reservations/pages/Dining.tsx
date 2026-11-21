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
    <>
      <div className="mb-6 h-[190px] overflow-hidden border border-[#c8a783] bg-[#ead5b8] max-[500px]:h-[140px]">
        <img className="block h-full w-full object-cover object-[center_53%]" src="/images/restaurant.webp" alt="Hotel restaurant dining room" />
      </div>
      <div className="mx-auto mb-5 flex max-w-[820px] items-baseline justify-between gap-4 max-[500px]:items-start max-[500px]:flex-col">
        <h1 className="m-0 font-['Gelasio'] text-[32px] font-normal leading-[1.15] tracking-[-.5px] text-[#441901]">Reserve a table</h1>
        <span className="font-serif text-sm text-[#70462c]">1-hour visit · 30 minutes between bookings</span>
      </div>
      <form className="mx-auto max-w-[820px] border border-[#c8a783] bg-[#fff8ee] p-[26px] max-[500px]:p-[19px]" onSubmit={book}>
        <div className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1">
          <label>
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
        <fieldset className="mt-[26px] min-w-0 border-0 p-0">
          <legend className="mb-2.5 p-0 font-serif text-base font-semibold text-[#54220e]">Dining time</legend>
          <div className="grid grid-cols-4 gap-2.5 max-[500px]:grid-cols-2">
            {query.data?.slots.map((item) => {
              const status = slotStatus(item);
              const disabled = status.tone === 'fit' || status.tone === 'full';
              return (
                <label className={`relative flex min-h-[92px] cursor-pointer flex-col items-start gap-0.5 border px-3.5 py-[13px] transition-colors ${status.tone === 'fit' || status.tone === 'full' ? 'cursor-not-allowed border-[#dfcdb7] bg-[#f1e3d0] text-[#947c67]' : 'border-[#d3b694] bg-[#fffdf8] hover:border-[#9b623e]'} ${time === item.start_time ? 'border-[#642c14] shadow-[0_0_0_2px_#642c14_inset]' : ''}`} key={item.start_time}>
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
                  <span className="font-['Gelasio'] text-[19px] font-normal tracking-[-.2px] text-[#441901]">{item.start_time.slice(0, 5)}</span>
                  <span className="text-[11px]">until {item.end_time.slice(0, 5)}</span>
                  <span className="mt-auto text-[11px] text-[#70462c]">{status.label}</span>
                </label>
              );
            })}
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
            <div className="mt-6 flex items-center justify-between gap-4 max-[500px]:items-start max-[500px]:flex-col">
              <span className="text-xs text-[#70462c]">Confirm within 15 minutes.</span>
              <button className="border border-[#642c14] bg-[#642c14] font-serif text-base font-bold text-[#fff8ee] hover:bg-[#54220e]" disabled={busy || query.loading || !slot?.available || !date || !guests}>
                {busy ? 'Holding your time…' : 'Continue to confirmation'}
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
