import { useState } from 'react';
import { BedDouble, Users, Wifi, Coffee, CalendarDays, Search, ChevronDown } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import type { Room } from '../../../types/models';
import { ErrorBox, Empty, Loading } from '../../../components/ui/common';
import { RoomDetailsModal } from '../components/RoomDetailsModal';
import { StayCalendar } from '../components/StayCalendar';
import { day, dateLabel, money } from '../../../utils/format';

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
    [dateOpen, setDateOpen] = useState(false);
  const query = useQuery<{ rooms: Room[]; room_types: string[] }>(`/hotel/rooms?${new URLSearchParams(search)}`);
  return (
    <>
      <form
        className="room-search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setDateOpen(false);
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
            <ChevronDown className="room-search-chevron" size={16} aria-hidden="true" />
          </span>
        </label>
        <div className="room-search-field room-search-dates">
          <CalendarDays size={20} aria-hidden="true" />
          <div className="room-search-content">
            <span>Check-in & check-out</span>
            <button type="button" className="room-date-trigger" aria-expanded={dateOpen} aria-label="Choose check-in and check-out dates" onClick={() => setDateOpen(!dateOpen)}>{dateLabel(filters.check_in)} <span aria-hidden="true">→</span> {dateLabel(filters.check_out)} <ChevronDown size={16} /></button>
          </div>
          {dateOpen && <div className="room-search-calendar-popover"><StayCalendar value={{ checkIn: filters.check_in, checkOut: filters.check_out }} onChange={(value) => setFilters({ ...filters, check_in: value.checkIn, check_out: value.checkOut })} /><button type="button" className="room-date-done" onClick={() => setDateOpen(false)}>Done</button></div>}
        </div>
        <label className="room-search-field">
          <Users size={20} aria-hidden="true" />
          <span className="room-search-content">
            <span>Guests</span>
            <select
              value={filters.guests}
              onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
            >
              {Array.from({ length: 6 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? 'guest' : 'guests'}
                </option>
              ))}
            </select>
            <ChevronDown className="room-search-chevron" size={16} aria-hidden="true" />
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
                      onClick={() => setSelected(room)}
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
      {selected && <RoomDetailsModal key={selected.id} room={selected} initialStay={{ checkIn: search.check_in, checkOut: search.check_out }} initialGuests={Number(search.guests)} onClose={() => setSelected(null)} />}
    </>
  );
}
