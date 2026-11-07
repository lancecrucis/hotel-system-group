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
  tables: { capacity: number }[];
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
      <div className="dining-photo">
        <img src="/images/restaurant.webp" alt="Hotel restaurant dining room" />
      </div>
      <div className="dining-form-heading">
        <h1>Reserve a table</h1>
        <span>1-hour visit · 30 minutes between bookings</span>
      </div>
      <form className="panel dining-reservation-form" onSubmit={book}>
        <div className="form-grid dining-form-fields">
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
            Time
            <select
              value={slot?.start_time ?? ''}
              required
              disabled={busy || query.loading || !slot}
              onChange={(e) => {
                setTime(e.target.value);
                setError('');
              }}
            >
              {query.data?.slots.map((item) => (
                <option key={item.start_time} value={item.start_time}>
                  {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
                  {item.available ? '' : ' · Full'}
                </option>
              ))}
            </select>
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
            <div className="dining-form-divider" />
            <h2>Contact details</h2>
            <div className="form-grid">
              <ContactFields />
            </div>
            <div className="dining-form-actions">
              <span>Confirm within 15 minutes.</span>
              <button disabled={busy || query.loading || !slot?.available || !date || !guests}>
                {busy ? 'Holding your time…' : 'Continue to confirmation'}
              </button>
            </div>
          </>
        ) : (
          <div className="dining-form-actions">
            <Link className="button" to="/login" state={{ from: '/dining' }}>
              Sign in to reserve
            </Link>
          </div>
        )}
      </form>
    </>
  );
}
