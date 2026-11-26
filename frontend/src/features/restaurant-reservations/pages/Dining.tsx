import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
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

const WHEEL_ITEM = 38;
const WHEEL_HEIGHT = WHEEL_ITEM * 5;
const WHEEL_PAD = (WHEEL_HEIGHT - WHEEL_ITEM) / 2;

const WHEEL_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const WHEEL_MINUTES = [0, 30];
const WHEEL_PERIODS = ['AM', 'PM'] as const;

function toClock(hour12: number, minute: number, period: 'AM' | 'PM') {
  const hour = (hour12 % 12) + (period === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function WheelColumn({
  items,
  selected,
  isEnabled,
  onPick,
  scrollRef,
  width,
  loop = true,
}: {
  items: (string | number)[];
  selected: number;
  isEnabled: (index: number) => boolean;
  onPick: (index: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  width?: string;
  loop?: boolean;
}) {
  const settle = useRef<number | null>(null);
  const laps = loop ? Math.max(3, Math.ceil(13 / items.length)) : 1;
  const rows = useMemo<{ item: string | number; index: number; block: number; key: string }[]>(() => {
    const out: { item: string | number; index: number; block: number; key: string }[] = [];
    for (let lap = 0; lap < laps; lap++) {
      items.forEach((item, index) => out.push({ item, index, block: lap * items.length + index, key: `${lap}-${index}-${item}` }));
    }
    return out;
  }, [items, laps]);
  const middle = loop ? Math.floor(laps / 2) * items.length : 0;
  const centerBlock = middle + selected;

  const scrollTo = (rowBlock: number, instant: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    const top = rowBlock * WHEEL_ITEM;
    if (instant) el.scrollTop = top;
    else el.scrollTo({ top, behavior: 'smooth' });
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = (middle + selected) * WHEEL_ITEM;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => () => {
    if (settle.current !== null) window.clearTimeout(settle.current);
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (settle.current !== null) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const block = Math.round(el.scrollTop / WHEEL_ITEM);
      const row = rows[Math.min(rows.length - 1, Math.max(0, block))];
      if (!row) return;
      if (!isEnabled(row.index)) {
        scrollTo(middle + selected, true);
        return;
      }
      if (row.index !== selected) onPick(row.index);
    }, 90);
  }

  return (
    <div
      className={`snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${width ?? 'flex-1'}`}
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        height: WHEEL_HEIGHT,
        paddingTop: WHEEL_PAD,
        paddingBottom: WHEEL_PAD,
        maskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)',
      }}
    >
      {rows.map((row: { item: string | number; index: number; block: number; key: string }) => {
        const enabled = isEnabled(row.index);
        const active = row.block === centerBlock;
        return (
          <button
            key={row.key}
            type="button"
            tabIndex={-1}
            disabled={!enabled}
            onClick={() => onPick(row.index)}
            className={`flex w-full snap-center items-center justify-center border-0 bg-transparent font-sans text-sm tabular-nums transition-colors ${
              active
                ? 'font-semibold text-[#3a1503]'
                : enabled
                  ? 'text-[#8a6b53] hover:text-[#54220e]'
                  : 'cursor-not-allowed text-[#d6c6b2]'
            }`}
            style={{ height: WHEEL_ITEM }}
          >
            {row.item}
          </button>
        );
      })}
    </div>
  );
}

function TimeWheel({
  value,
  options,
  disabled,
  unavailable,
  onChange,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  unavailable?: boolean;
  onChange: (time: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  const valid = new Set(options);
  const base = value || options[0] || '08:00';
  const [baseHour, baseMinute] = base.slice(0, 5).split(':').map(Number);
  const hour12 = baseHour % 12 || 12;
  const minute = WHEEL_MINUTES.includes(baseMinute) ? baseMinute : 0;
  const period: 'AM' | 'PM' = baseHour >= 12 ? 'PM' : 'AM';

  const hourIndex = Math.max(0, WHEEL_HOURS.indexOf(hour12));
  const minuteIndex = Math.max(0, WHEEL_MINUTES.indexOf(minute));
  const periodIndex = Math.max(0, WHEEL_PERIODS.indexOf(period));

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function nearestHour(target: number, nextPeriod: 'AM' | 'PM', atMinute: number): number | null {
    const candidates = WHEEL_HOURS.filter((hour) => valid.has(toClock(hour, atMinute, nextPeriod)));
    const pool = candidates.length
      ? candidates
      : WHEEL_HOURS.filter((hour) => WHEEL_MINUTES.some((m) => valid.has(toClock(hour, m, nextPeriod))));
    if (!pool.length) return null;
    const distance = (a: number, b: number) => {
      const diff = Math.abs(a - b) % 12;
      return Math.min(diff, 12 - diff);
    };
    return pool.reduce((best, hour) => (distance(hour, target) < distance(best, target) ? hour : best), pool[0]);
  }

  function pickHour(index: number) {
    const nextHour = WHEEL_HOURS[index];
    if (valid.has(toClock(nextHour, minute, period))) {
      onChange(toClock(nextHour, minute, period));
      return;
    }
    // Same clock reading in the other half of the day, if that is bookable.
    const flipped: 'AM' | 'PM' = period === 'AM' ? 'PM' : 'AM';
    if (valid.has(toClock(nextHour, minute, flipped))) {
      onChange(toClock(nextHour, minute, flipped));
      return;
    }
    // Otherwise keep the hour and take its first bookable minute/period.
    const fallback = WHEEL_PERIODS.flatMap((p) => WHEEL_MINUTES.map((m) => ({ m, p }))).find(({ m, p }) =>
      valid.has(toClock(nextHour, m, p)),
    );
    if (fallback) onChange(toClock(nextHour, fallback.m, fallback.p));
  }

  function pickMinute(index: number) {
    const nextMinute = WHEEL_MINUTES[index];
    if (valid.has(toClock(hour12, nextMinute, period))) {
      onChange(toClock(hour12, nextMinute, period));
      return;
    }
    // That half-hour does not exist at this hour: step back to the nearest hour that has it.
    const snapped = nearestHour(hour12, period, nextMinute);
    if (snapped !== null) onChange(toClock(snapped, nextMinute, period));
  }

  function pickPeriod(index: number) {
    const nextPeriod = WHEEL_PERIODS[index];
    if (valid.has(toClock(hour12, minute, nextPeriod))) {
      onChange(toClock(hour12, minute, nextPeriod));
      return;
    }
    const snapped = nearestHour(hour12, nextPeriod, minute);
    if (snapped !== null) onChange(toClock(snapped, minute, nextPeriod));
  }

  const fieldClass = `flex !min-h-[44px] w-full items-center justify-between gap-2 !rounded-[10px] !border !px-4 !py-2 !font-sans !text-sm text-left focus:!outline-none focus:!ring-2 disabled:cursor-not-allowed ${
    unavailable
      ? '!border-[#b42318] !bg-[#fff1f0] !text-[#8f1d14] focus:!border-[#b42318] focus:!ring-[#b42318]/20'
      : '!border-[#b99673] !bg-transparent !text-[#54220e] focus:!border-[#642c14] focus:!ring-[#642c14]/20'
  }`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        className={fieldClass}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={unavailable}
        aria-describedby={unavailable ? 'dining-time-error' : 'dining-time-help'}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? undefined : 'text-[#8a7561]'}>{value ? displayTime(value) : 'Choose a time'}</span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={`shrink-0 text-[#8a7561] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-[10px] border border-[#b99673] bg-[#fff8ee] shadow-[0_10px_24px_rgba(84,34,14,0.18)]">
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-2 right-2 top-1/2 -translate-y-1/2 rounded-[6px] border border-[#c8a783] bg-[#f2e4d0]"
              style={{ height: WHEEL_ITEM }}
            />
            <div className="relative flex items-center justify-center px-4">
              <WheelColumn
                items={WHEEL_HOURS}
                selected={hourIndex}
                isEnabled={(index) =>
                  WHEEL_MINUTES.some((m) => WHEEL_PERIODS.some((p) => valid.has(toClock(WHEEL_HOURS[index], m, p))))
                }
                onPick={pickHour}
                scrollRef={hourRef}
                width="w-[52px] shrink-0"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none w-3 shrink-0 text-center font-sans text-sm font-semibold text-[#3a1503]"
              >
                :
              </span>
              <WheelColumn
                items={WHEEL_MINUTES.map((m) => String(m).padStart(2, '0'))}
                selected={minuteIndex}
                isEnabled={() => true}
                onPick={pickMinute}
                scrollRef={minuteRef}
                width="w-[52px] shrink-0"
                loop={false}
              />
              <WheelColumn
                items={[...WHEEL_PERIODS]}
                selected={periodIndex}
                isEnabled={() => true}
                onPick={pickPeriod}
                scrollRef={periodRef}
                width="w-[56px] shrink-0"
                loop={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
            <TimeWheel
              value={time}
              options={
                restaurantSettings.data
                  ? startTimes(restaurantSettings.data.settings.opening_time, restaurantSettings.data.settings.closing_time)
                  : []
              }
              unavailable={timeUnavailable}
              disabled={busy || checking || restaurantSettings.loading || !restaurantSettings.data}
              onChange={(next) => {
                setTime(next);
                clearAvailability();
              }}
            />
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
          className="mt-5 min-h-11 w-full rounded-[9px] border-0 bg-[#642c14] px-4 py-2 font-['Crimson_Text'] text-xl font-bold text-[#fff8ed] hover:bg-[#54220e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#642c14] disabled:cursor-not-allowed disabled:bg-[#d4c4b0] disabled:text-[#8a7561] disabled:hover:bg-[#d4c4b0]"
          onClick={() => void checkAvailability()}
          disabled={checking || busy || restaurantSettings.loading || !date || !guests || !time}
        >
          Show available times
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
              <span className="text-xs text-[#70462c]">Your table is confirmed as soon as you reserve. Pay at the restaurant when you arrive.</span>
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
