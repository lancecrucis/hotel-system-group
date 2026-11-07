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
interface Slot {
  start_time: string;
  end_time: string;
  available_seats: number;
  available: boolean;
}
export function Dining() {
  const initial = { date: day(1), guests: '2' },
    [filters, setFilters] = useState(initial),
    [search, setSearch] = useState(initial),
    [selected, setSelected] = useState<Slot | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const { user } = useAuth(),
    navigate = useNavigate(),
    query = useQuery<{ slots: Slot[]; settings: Settings }>(
      `/restaurant/availability?${new URLSearchParams(search)}`,
    );
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
          reservation_date: search.date,
          start_time: selected!.start_time,
          guest_count: Number(search.guests),
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
      <form
        className="panel search-form dining-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch({ ...filters });
          query.reload();
        }}
      >
        <label>
          Dining date
          <input
            type="date"
            required
            min={day()}
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
        </label>
        <label>
          Party size
          <input
            type="number"
            min={1}
            max={query.data?.settings.max_guest_per_booking ?? 10}
            required
            value={filters.guests}
            onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
          />
        </label>
        <button disabled={query.loading}>Find a time</button>
      </form>
      <div className="section-heading">
        <h1 className="booking-heading">Available dining times</h1>
        <span className="muted">
          {dateLabel(search.date)} · {search.guests} guests
        </span>
      </div>
      <ErrorBox message={query.error} />
      {query.loading ? (
        <Loading />
      ) : (
        <div className="panel">
          <div className="slot-grid">
            {query.data?.slots.map((slot) => (
              <button
                className={`slot ${slot.available ? '' : 'unavailable'}`}
                key={slot.start_time}
                disabled={!slot.available}
                onClick={() => {
                  setSelected(slot);
                  setError('');
                }}
              >
                <strong>{slot.start_time}</strong>
                <small>{slot.available ? `${slot.available_seats} seats available` : 'Fully booked'}</small>
              </button>
            ))}
          </div>
          {query.data?.slots.length === 0 && <Empty title="No dining times available" />}
        </div>
      )}
      {selected && (
        <Modal
          title="Review your dining reservation"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="booking-summary">
            <strong>{dateLabel(search.date)}</strong>
            <p className="inline">
              <Clock size={16} />
              {selected.start_time}–{selected.end_time}
              <Users size={16} />
              {search.guests} guests
            </p>
          </div>
          <ErrorBox message={error} />
          {user ? (
            <form className="form-grid" onSubmit={book}>
              <ContactFields />
              <p className="full muted small-text">Confirm within 15 minutes.</p>
              <div className="full">
                <button disabled={busy}>{busy ? 'Holding your time…' : 'Continue to confirmation'}</button>
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
