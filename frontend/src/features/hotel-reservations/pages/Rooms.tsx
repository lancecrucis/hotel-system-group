import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, Users, Wifi, Coffee, CalendarDays, Search } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { Room, Reservation } from '../../../types/models';
import { ErrorBox, Empty, Loading, Modal } from '../../../components/ui/common';
import { ContactFields } from '../components/ContactFields';
import { day, money, nights, dateLabel } from '../../../utils/format';

function roomImage(room: Room) {
  const type = room.room_type.toLowerCase();
  if (type.includes('executive')) return '/images/rooms/executive-suite.webp';
  if (type.includes('family')) return '/images/rooms/family-suite.webp';
  if (type.includes('twin') || room.bed_count > 1) return '/images/rooms/deluxe-twin.webp';
  return '/images/rooms/deluxe-king.webp';
}

export function Rooms() {
  const initial = { room_type: '', check_in: day(1), check_out: day(2), guests: '2' };
  const [filters, setFilters] = useState(initial),
    [search, setSearch] = useState(initial),
    [selected, setSelected] = useState<Room | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const { user } = useAuth(),
    navigate = useNavigate(),
    query = useQuery<{ rooms: Room[]; room_types: string[] }>(`/hotel/rooms?${new URLSearchParams(search)}`);
  const count = nights(search.check_in, search.check_out);
  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const contact = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const { reservation } = await api<{ reservation: Reservation }>(
        '/hotel/reservations',
        send('POST', {
          ...contact,
          room_id: selected!.id,
          check_in: search.check_in,
          check_out: search.check_out,
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
      <form
        className="room-search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch({ ...filters });
          query.reload();
        }}
      >
        <label className="room-search-field">
          <BedDouble size={20} aria-hidden="true" />
          <span className="room-search-content">
            <span>Room type</span>
            <select
              value={filters.room_type}
              onChange={(e) => setFilters({ ...filters, room_type: e.target.value })}
            >
              <option value="">All room types</option>
              {query.data?.room_types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              {filters.room_type && !query.data?.room_types.includes(filters.room_type) && (
                <option value={filters.room_type}>{filters.room_type}</option>
              )}
            </select>
          </span>
        </label>
        <div className="room-search-field room-search-dates">
          <CalendarDays size={20} aria-hidden="true" />
          <div className="room-search-content">
            <span>Check-in &amp; check-out</span>
            <div className="room-date-inputs">
              <label>
                <span className="sr-only">Check-in</span>
                <input
                  aria-label="Check-in"
                  type="date"
                  required
                  min={day()}
                  value={filters.check_in}
                  onChange={(e) => setFilters({ ...filters, check_in: e.target.value })}
                />
              </label>
              <span aria-hidden="true">–</span>
              <label>
                <span className="sr-only">Check-out</span>
                <input
                  aria-label="Check-out"
                  type="date"
                  required
                  min={filters.check_in}
                  value={filters.check_out}
                  onChange={(e) => setFilters({ ...filters, check_out: e.target.value })}
                />
              </label>
            </div>
          </div>
        </div>
        <label className="room-search-field">
          <Users size={20} aria-hidden="true" />
          <span className="room-search-content">
            <span>Guests</span>
            <input
              type="number"
              min={1}
              max={20}
              required
              value={filters.guests}
              onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
            />
          </span>
        </label>
        <button disabled={query.loading}>
          Find a room <Search size={18} />
        </button>
      </form>
      <div className="section-heading">
        <h1 className="booking-heading">Available rooms</h1>
        <span className="muted">{query.data?.rooms.filter((r) => r.available).length ?? 0} rooms</span>
      </div>
      <ErrorBox message={query.error} />
      {query.loading ? (
        <Loading />
      ) : (
        <div className="room-grid">
          {query.data?.rooms
            .filter((r) => r.available)
            .map((room) => (
              <article className="room-card" key={room.id}>
                <img
                  className="room-image"
                  src={room.image_url || roomImage(room)}
                  alt={`${room.room_type}, room ${room.room_number}`}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = roomImage(room);
                  }}
                />
                <div className="room-body">
                  <div className="split">
                    <h3>{room.room_type}</h3>
                  </div>
                  <div className="amenities">
                    <span>
                      <Users size={15} />
                      {room.capacity} guests
                    </span>
                    <span>
                      <BedDouble size={15} />
                      {room.bed_count} {room.bed_type}
                    </span>
                    {room.has_wifi && (
                      <span>
                        <Wifi size={15} />
                        Wi-Fi
                      </span>
                    )}
                    {room.breakfast_included && (
                      <span>
                        <Coffee size={15} />
                        Breakfast
                      </span>
                    )}
                  </div>
                  <div className="room-price">
                    <span>
                      <strong>{money(room.price_per_night)}</strong>
                      <small> / night</small>
                    </span>
                    <button
                      className="small"
                      onClick={() => {
                        setSelected(room);
                        setError('');
                      }}
                    >
                      Select room
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}
      {!query.loading && !query.error && query.data?.rooms.filter((r) => r.available).length === 0 && (
        <Empty title="No rooms available" />
      )}
      {selected && (
        <Modal
          title="Review your stay"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="booking-summary">
            <strong>
              {selected.room_type} · Room {selected.room_number}
            </strong>
            <p>
              {dateLabel(search.check_in)} → {dateLabel(search.check_out)} · {count}{' '}
              {count === 1 ? 'night' : 'nights'} · {search.guests} guests
            </p>
            <div className="split">
              <span>Total room charge</span>
              <strong>{money(Number(selected.price_per_night) * count)}</strong>
            </div>
          </div>
          {selected.images.length > 0 && (
            <div className="gallery">
              {selected.images.map((i, index) => (
                <img key={index} src={i.image_url} alt={`${selected.room_type} view ${index + 1}`} />
              ))}
            </div>
          )}
          <ErrorBox message={error} />
          <p className="muted small-text">
            {selected.description} {selected.special_amenities}
          </p>
          {user ? (
            <form className="form-grid" onSubmit={book}>
              <ContactFields />
              <p className="full muted small-text">Pay at the property · Confirm within 15 minutes.</p>
              <div className="full actions">
                <button disabled={busy}>{busy ? 'Holding your room…' : 'Continue to confirmation'}</button>
                <button type="button" className="secondary" disabled={busy} onClick={() => setSelected(null)}>
                  Back
                </button>
              </div>
            </form>
          ) : (
            <div className="stack">
              <Link className="button" to="/login" state={{ from: '/rooms' }}>
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
