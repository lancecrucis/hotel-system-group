import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, Check, ChevronLeft, ChevronRight, Coffee, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { ErrorBox, Modal } from '../../../components/ui/common';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { Reservation, Room } from '../../../types/models';
import { dateLabel, money, nights } from '../../../utils/format';
import { ContactFields } from './ContactFields';
import { StayCalendar } from './StayCalendar';

function roomImage(room: Room, extra = false) {
  const type = room.room_type.toLowerCase();
  const name = type.includes('executive') ? 'executive-suite' : type.includes('family') ? 'family-suite' : type.includes('twin') || room.bed_count > 1 ? 'deluxe-twin' : 'deluxe-king';
  return `/images/rooms/${name}${extra ? '-view.png' : '.webp'}`;
}

function photos(room: Room) {
  const provided = [room.image_url, ...room.images.map((image) => image.image_url)].filter(Boolean);
  return [...new Set(provided.length >= 2 ? provided : [...provided, roomImage(room), roomImage(room, true)])];
}

export function RoomDetailsModal({ room, initialStay, initialGuests, onClose }: {
  room: Room;
  initialStay: { checkIn: string; checkOut: string };
  initialGuests: number;
  onClose: () => void;
}) {
  const [stay, setStay] = useState(initialStay);
  const [guests, setGuests] = useState(initialGuests);
  const [photo, setPhoto] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const gallery = photos(room);
  const nightCount = nights(stay.checkIn, stay.checkOut);
  const availability = useQuery<{ rooms: Room[] }>(`/hotel/rooms?${new URLSearchParams({ check_in: stay.checkIn, check_out: stay.checkOut, guests: String(guests) })}`);
  const available = Boolean(availability.data?.rooms.some((item) => item.id === room.id && item.available));

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!available || busy) return;
    setBusy(true);
    setError('');
    try {
      const contact = Object.fromEntries(new FormData(event.currentTarget));
      const { reservation } = await api<{ reservation: Reservation }>('/hotel/reservations', send('POST', {
        ...contact,
        room_id: room.id,
        check_in: stay.checkIn,
        check_out: stay.checkOut,
        guest_count: guests,
      }));
      navigate(`/reservations/${reservation.id}`);
    } catch (cause) {
      setError((cause as Error).message);
      availability.reload();
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={room.room_type} className="room-detail-dialog" onClose={() => { if (!busy) onClose(); }}>
    <div className="room-detail-layout">
      <div className="room-detail-main">
        <div className="room-detail-photo">
          <img src={gallery[photo]} alt={`${room.room_type} view ${photo + 1} of ${gallery.length}`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} />
          {gallery.length > 1 && <div className="room-photo-controls">
            <button type="button" aria-label="Previous photo" onClick={() => setPhoto((photo - 1 + gallery.length) % gallery.length)}><ChevronLeft size={20} /></button>
            <span>{photo + 1} / {gallery.length}</span>
            <button type="button" aria-label="Next photo" onClick={() => setPhoto((photo + 1) % gallery.length)}><ChevronRight size={20} /></button>
          </div>}
        </div>
        <div className="room-photo-thumbnails" aria-label="Room photos">
          {gallery.map((image, index) => <button type="button" key={`${image}-${index}`} className={photo === index ? 'active' : ''} aria-label={`Show room photo ${index + 1}`} aria-pressed={photo === index} onClick={() => setPhoto(index)}><img src={image} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} /></button>)}
        </div>
        <div className="room-detail-info">
          <h3>Room details</h3>
          <div className="room-detail-facts">
            <span><Users size={17} /> Up to {room.capacity} guests</span>
            <span><BedDouble size={17} /> {room.bed_count} {room.bed_type}</span>
            {room.has_wifi && <span><Wifi size={17} /> Wi-Fi</span>}
            {room.breakfast_included && <span><Coffee size={17} /> Breakfast included</span>}
          </div>
          {room.description && <p>{room.description}</p>}
          {room.special_amenities && <p>{room.special_amenities}</p>}
        </div>
      </div>
      <div className="room-detail-booking">
        <div className="room-detail-price"><strong>{money(room.price_per_night)}</strong><span> / night</span></div>
        <StayCalendar value={stay} onChange={setStay} />
        <label className="room-detail-guests">Guests
          <select value={guests} onChange={(event) => setGuests(Number(event.target.value))}>
            {Array.from({ length: Math.min(6, room.capacity) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
          </select>
        </label>
        <div className="room-availability" role="status">
          {availability.loading ? 'Checking availability…' : availability.error ? 'Could not check availability' : available ? <><Check size={16} /> Available for these dates</> : 'Unavailable for these dates'}
        </div>
        <ErrorBox message={availability.error || error} />
        <div className="room-detail-total"><span>{money(room.price_per_night)} × {nightCount} {nightCount === 1 ? 'night' : 'nights'}</span><strong>{money(Number(room.price_per_night) * nightCount)}</strong></div>
        <p className="room-detail-dates">{dateLabel(stay.checkIn)} – {dateLabel(stay.checkOut)}</p>
        {user ? <form className="room-book-form" onSubmit={book}>
          <ContactFields />
          <button className="room-book-button" disabled={busy || availability.loading || !available}>{busy ? 'Holding your room…' : 'Book room'}</button>
          <p className="muted small-text">Held for 15 minutes after booking. Pay at the property.</p>
        </form> : <div className="room-book-form"><Link className="button room-book-button" to="/login" state={{ from: '/rooms' }}>Log in to book room</Link><Link to="/register">Create an account</Link></div>}
      </div>
    </div>
  </Modal>;
}
