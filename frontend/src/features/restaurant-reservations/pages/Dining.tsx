import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { Settings, Reservation } from '../../../types/models';
import { ErrorBox, Empty, Loading, Modal } from '../../../components/ui/common';
import { ContactFields } from '../../hotel-reservations/components/ContactFields';
import { day } from '../../../utils/format';

interface DiningTable {
  id: string;
  name: string;
  capacity: number;
  available: boolean;
}
interface Slot {
  start_time: string;
  end_time: string;
  available: boolean;
  tables: DiningTable[];
}
export function Dining() {
  const [date, setDate] = useState(day(1));
  const [guests, setGuests] = useState('2');
  const [time, setTime] = useState('18:00');
  const [selected, setSelected] = useState<DiningTable | null>(null);
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
  const selectedTable = slot?.tables.find((table) => table.id === selected?.id);

  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (query.loading || !selectedTable?.available || !slot || !date || !guests) {
      setError('This table is unavailable for the selected date, time, or party size.');
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
          table_id: selectedTable.id,
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
      <div className="panel search-form dining-search">
        <label>
          Dining date
          <input
            type="date"
            required
            min={day()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelected(null);
            }}
          />
        </label>
        <label>
          Time
          <select
            value={slot?.start_time ?? ''}
            disabled={query.loading || !slot}
            onChange={(e) => {
              setTime(e.target.value);
              setSelected(null);
            }}
          >
            {query.data?.slots.map((item) => (
              <option key={item.start_time} value={item.start_time}>
                {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Guests
          <input
            type="number"
            min={1}
            max={query.data?.settings.max_guest_per_booking ?? 10}
            value={guests}
            onChange={(e) => {
              setGuests(e.target.value);
              setSelected(null);
            }}
          />
        </label>
      </div>
      <div className="section-heading">
        <h1 className="booking-heading">Choose a table</h1>
        <span className="muted">1 hour · 30-minute buffer</span>
      </div>
      <ErrorBox message={query.error} />
      {query.loading ? (
        <Loading />
      ) : slot && !slot.tables.some((table) => table.capacity >= Number(guests)) ? (
        <Empty title="No table fits this party size" />
      ) : slot ? (
        <div className="panel">
          <div className="dining-table-grid">
            {slot.tables.map((table) => (
              <button
                type="button"
                key={table.id}
                className="dining-table-option"
                disabled={!table.available}
                onClick={() => {
                  setSelected(table);
                  setError('');
                }}
              >
                <strong>{table.name}</strong>
                <small>
                  {table.capacity} seats · {table.available ? 'Available' : 'Unavailable'}
                </small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Empty title="No dining times available" />
      )}
      {selected && (
        <Modal
          title="Review dining reservation"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="booking-summary">
            <strong>
              {selected.name} · {selected.capacity} seats
            </strong>
          </div>
          <div className="form-grid dining-edit-fields">
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
                disabled={busy || query.loading || !slot}
                onChange={(e) => {
                  setTime(e.target.value);
                  setError('');
                }}
              >
                {query.data?.slots.map((item) => (
                  <option key={item.start_time} value={item.start_time}>
                    {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
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
                max={Math.min(selected.capacity, query.data?.settings.max_guest_per_booking ?? 10)}
                value={guests}
                disabled={busy}
                onChange={(e) => {
                  setGuests(e.target.value);
                  setError('');
                }}
              />
            </label>
          </div>
          {query.loading && <Loading />}
          <ErrorBox message={query.error} />
          {!query.loading && selectedTable && !selectedTable.available && (
            <ErrorBox message="This table is unavailable. Change the date, time, or guest count." />
          )}
          <ErrorBox message={error} />
          {user ? (
            <form className="form-grid" onSubmit={book}>
              <ContactFields />
              <p className="full muted small-text">Confirm within 15 minutes.</p>
              <div className="full actions">
                <button disabled={busy || query.loading || !selectedTable?.available || !date || !guests}>
                  {busy ? 'Holding your table…' : 'Continue to confirmation'}
                </button>
                <button type="button" className="secondary" disabled={busy} onClick={() => setSelected(null)}>
                  Choose another table
                </button>
              </div>
            </form>
          ) : (
            <div className="stack">
              <Link className="button" to="/login" state={{ from: '/dining' }}>
                Sign in to continue
              </Link>
              <Link to="/register">Create an account</Link>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
