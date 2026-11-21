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

type SlotStatus = { tone: 'fit' | 'full' | 'limited' | 'open'; label: string };

function displayTime(time: string) {
  const [hourText, minute] = time.slice(0, 5).split(':');
  const hour = Number(hourText);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
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
  const slot = query.data?.slots.find((item) => item.start_time === time);
  const maximumSeats = Math.max(0, ...(query.data?.slots[0]?.tables.map((table) => table.capacity) ?? []));
  const maxGuests = Math.min(query.data?.settings.max_guest_per_booking ?? 10, maximumSeats || 10);
  const guestCount = Number(guests) || 0;
  const slotStatus = (item: Slot): SlotStatus => {
    if (guestCount > (query.data?.settings.max_guest_per_booking ?? 10))
      return { tone: 'fit', label: 'Party size exceeds limit' };
    const fittingTables = item.tables.filter((table) => table.capacity >= guestCount);
    const availableTables = fittingTables.filter((table) => table.available).length;
    if (!fittingTables.length) return { tone: 'fit', label: 'No table fits' };
    if (!availableTables) return { tone: 'full', label: 'Unavailable for this time' };
    if (availableTables <= 2)
      return {
        tone: 'limited',
        label: `${availableTables} suitable ${availableTables === 1 ? 'table' : 'tables'} left`,
      };
    return { tone: 'open', label: `${availableTables} suitable tables available` };
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
    <div className="min-h-[calc(100vh-160px)] bg-[#f9f3e7]">
      <div className="mb-6 h-[190px] overflow-hidden border border-[#c8a783] bg-[#ead5b8] max-[500px]:h-[140px]">
        <img className="block h-full w-full object-cover object-[center_53%]" src="/images/restaurant.webp" alt="Hotel restaurant dining room" />
      </div>
      <div className="mx-auto mb-5 flex max-w-[820px] items-baseline justify-between gap-4 max-[500px]:items-start max-[500px]:flex-col">
        <h1 className="m-0 font-['Gelasio'] text-[32px] font-normal leading-[1.15] tracking-[-.5px] text-[#441901]">Reserve a table</h1>
        <span className="font-serif text-sm text-[#70462c]">1-hour dining · 30-minute table reset</span>
      </div>
      <form className="mx-auto max-w-[820px] border border-[#c8a783] bg-[#fff8ee] p-[26px] max-[500px]:p-[19px]" onSubmit={book}>
        <div className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1">
          <label className="flex flex-col gap-[7px] font-serif text-sm text-[#54220e]">
            Dining date
            <input
              className="!min-h-[44px] !rounded-[10px] !border !border-[#b99673] !bg-transparent !px-4 !py-2 !font-sans !text-sm text-[#54220e] focus:!border-[#642c14] focus:!outline-none focus:!ring-2 focus:!ring-[#642c14]/20"
              type="date"
              required
              min={day()}
              value={date}
              disabled={busy}
              onChange={(e) => {
                setDate(e.target.value);
                setTime('');
                setError('');
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
              disabled={busy}
              onChange={(e) => {
                setGuests(e.target.value);
                setError('');
              }}
            />
          </label>
        </div>
        <fieldset className="mt-[26px] min-w-0 border-0 p-0">
          <legend className="mb-2.5 p-0 font-serif text-base font-semibold text-[#54220e]">Dining time</legend>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#70462c]" aria-label="Time availability key">
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#3f7650]" />Available</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#bd7b27]" />Limited</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#947c67]" />Unavailable</span>
          </div>
          <div className="grid grid-cols-4 gap-3 max-[760px]:grid-cols-3 max-[560px]:grid-cols-2">
            {query.data?.slots.map((item) => {
              const status = slotStatus(item);
              const disabled = status.tone === 'fit' || status.tone === 'full';
              const toneClass = disabled
                ? 'cursor-not-allowed border-[#e2d7cb] bg-[#f3ece4] text-[#806d5b]'
                : status.tone === 'limited'
                  ? 'border-[#d9b46f] bg-[#fffaef] hover:border-[#9b623e]'
                  : 'border-[#c9d9ca] bg-white hover:border-[#6d9272]';
              const statusClass = disabled
                ? 'bg-[#ece5dc] text-[#6e5c4a]'
                : status.tone === 'limited'
                  ? 'bg-[#f8e9c9] text-[#80520f]'
                  : 'bg-[#e5f0e6] text-[#315d3a]';
              return (
                <label className={`flex min-h-[132px] cursor-pointer flex-col rounded-xl border p-3.5 text-left font-sans transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#642c14] ${toneClass} ${disabled ? 'cursor-not-allowed' : ''} ${time === item.start_time ? 'border-[#642c14] bg-[#fff8ed] ring-2 ring-[#642c14]' : ''}`} key={item.start_time}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="dining-time"
                    value={item.start_time}
                    checked={time === item.start_time}
                    disabled={busy || disabled}
                    aria-label={`${item.start_time.slice(0, 5)} to ${item.end_time.slice(0, 5)}: ${status.label}`}
                    onChange={(e) => {
                      setTime(e.target.value);
                      setError('');
                    }}
                  />
                  <span className="flex w-full items-baseline justify-between gap-1">
                    <span className="text-[19px] font-semibold leading-tight tracking-[-.35px] text-[#34241a]">{displayTime(item.start_time)}</span>
                    <span className="text-xs tabular-nums text-[#7d746b]">{item.start_time.slice(0, 5)}</span>
                  </span>
                  <span className="mt-2 text-xs text-[#62564d]">Dining ends {displayTime(item.end_time)} <span className="tabular-nums text-[#7d746b]">· {item.end_time.slice(0, 5)}</span></span>
                  <span className={`mt-auto self-start rounded-full px-2.5 py-1 text-[11px] font-semibold leading-tight ${statusClass}`}>{status.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {!query.loading && !query.error && query.data && query.data.slots.length > 0 && !slot && (
          <p className="mt-3 text-sm text-[#70462c]">Choose a dining time to continue.</p>
        )}
        {query.loading ? <Loading /> : <ErrorBox message={query.error} />}
        {!query.loading && !query.error && query.data?.slots.length === 0 && (
          <ErrorBox message="No dining times available for this date." />
        )}
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
            <div className="my-7 border-t border-[#d8bfa0]" />
            <h2 className="mb-[18px] font-['Gelasio'] text-[22px] font-normal text-[#441901]">Contact details</h2>
            <div className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1">
              <ContactFields />
            </div>
            <div className="mt-6 flex flex-col items-stretch gap-3">
              <span className="text-xs text-[#70462c]">Your reservation is confirmed when you book.</span>
              <button className="min-h-11 w-full rounded-[9px] border-0 bg-[#642c14] px-4 py-2 font-['Crimson_Text'] text-xl font-bold text-[#fff8ed] hover:bg-[#54220e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#642c14] disabled:cursor-not-allowed disabled:bg-[#bba896]" disabled={busy || query.loading || !slot?.available || !date || !guests}>
                {busy ? 'Booking your table…' : 'Reserve table'}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 flex items-center justify-between gap-4">
            <Link className="inline-flex min-h-11 items-center justify-center border border-[#642c14] bg-[#642c14] px-[21px] py-[11px] font-serif font-bold text-[#fff8ee] no-underline hover:bg-[#54220e]" to="/login" state={{ from: '/dining' }}>
              Sign in to reserve
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
