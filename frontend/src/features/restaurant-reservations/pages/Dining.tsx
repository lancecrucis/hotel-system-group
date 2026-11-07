import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { Settings, Reservation } from '../../../types/models';
import { ErrorBox, Empty, Loading, Modal } from '../../../components/ui/common';
import { ContactFields } from '../../hotel-reservations/components/ContactFields';
import { day, dateLabel } from '../../../utils/format';

interface DiningTable {
  id: string;
  name: string;
  shape: 'round' | 'square' | 'rectangle';
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
  const [selected, setSelected] = useState<{ table: DiningTable; slot: Slot } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useQuery<{ slots: Slot[]; settings: Settings }>(
    `/restaurant/availability?${new URLSearchParams({ date, guests })}`,
  );
  const slot =
    query.data?.slots.find((item) => item.start_time === time) ??
    query.data?.slots.find((item) => item.available) ??
    query.data?.slots[0];

  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const contact = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const { reservation } = await api<{ reservation: Reservation }>(
        '/restaurant/reservations',
        send('POST', {
          ...contact,
          reservation_date: date,
          start_time: selected!.slot.start_time,
          guest_count: Number(guests),
          table_id: selected!.table.id,
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
                  setSelected({ table, slot });
                  setError('');
                }}
              >
                <span className={`table-shape table-shape-${table.shape}`} aria-hidden="true" />
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
              {selected.table.name} · {dateLabel(date)}
            </strong>
            <p className="inline">
              <Clock size={16} />
              {selected.slot.start_time.slice(0, 5)}–{selected.slot.end_time.slice(0, 5)}
              <Users size={16} />
              {guests} guests
            </p>
          </div>
          <ErrorBox message={error} />
          {user ? (
            <form className="form-grid" onSubmit={book}>
              <ContactFields />
              <p className="full muted small-text">Confirm within 15 minutes.</p>
              <div className="full actions">
                <button disabled={busy}>{busy ? 'Holding your table…' : 'Continue to confirmation'}</button>
                <button type="button" className="secondary" disabled={busy} onClick={() => setSelected(null)}>
                  Edit time or guests
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
