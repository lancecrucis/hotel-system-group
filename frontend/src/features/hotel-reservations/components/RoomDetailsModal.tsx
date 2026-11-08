import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Check, ChevronLeft, ChevronRight, Coffee, CreditCard, Landmark, Users, WalletCards, Wifi } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { ErrorBox, Modal } from '../../../components/ui/common';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { Reservation, Room } from '../../../types/models';
import { dateLabel, money, nights } from '../../../utils/format';
import { ContactFields } from './ContactFields';
import type { ContactDetails } from './ContactFields';
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
  const [step, setStep] = useState(1);
  const [created, setCreated] = useState<Reservation | null>(null);
  const [contact, setContact] = useState<ContactDetails>({
    contact_name: user ? `${user.first_name} ${user.last_name}` : '',
    contact_email: user?.email ?? '',
    contact_phone: user?.phone_number.startsWith('+63') ? user.phone_number : '+63 ',
    special_requests: '',
  });
  const gallery = photos(room);
  const nightCount = nights(stay.checkIn, stay.checkOut);
  const availability = useQuery<{ rooms: Room[] }>(`/hotel/rooms?${new URLSearchParams({ check_in: stay.checkIn, check_out: stay.checkOut, guests: String(guests) })}`);
  const available = Boolean(availability.data?.rooms.some((item) => item.id === room.id && item.available));

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step !== 4) return;
    if (!available || busy) return;
    setBusy(true);
    setError('');
    try {
      const { reservation } = await api<{ reservation: Reservation }>('/hotel/reservations', send('POST', {
        ...contact,
        room_id: room.id,
        check_in: stay.checkIn,
        check_out: stay.checkOut,
        guest_count: guests,
      }));
      setCreated(reservation);
    } catch (cause) {
      setError((cause as Error).message);
      availability.reload();
    } finally {
      setBusy(false);
    }
  }

  const total = Number(room.price_per_night) * nightCount;

  return <Modal title={created ? 'Reservation submitted' : step === 1 ? room.room_type : 'Complete your booking'} className={`room-detail-dialog ${step > 1 ? 'room-checkout-dialog' : ''}`} onClose={() => { if (!busy) onClose(); }}>
    <div className={`room-detail-layout ${step > 1 ? 'checkout-focus' : ''}`}>
      {step === 1 && <div className="room-detail-main">
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
      </div>}
      <div className={`room-detail-booking ${step > 1 ? 'focused' : ''}`}>
        {!created && <ol className="booking-steps" aria-label="Booking progress">
          {['Booking', 'Guest', 'Payment', 'Confirmation'].map((name, index) => <li key={name} className={step === index + 1 ? 'active' : step > index + 1 ? 'complete' : ''}><span>{step > index + 1 ? <Check size={13} /> : index + 1}</span><small>{name}</small></li>)}
        </ol>}
        {created ? <div className="booking-created" role="status"><span className="booking-created-icon"><Check size={28} /></span><h3>Your room is held</h3><p>Reservation {created.reservation_reference} is awaiting confirmation. Open its details to confirm it and follow its progress.</p><Link className="button" to={`/reservations/${created.id}`}>View my reservation</Link></div> : user ? <form className="room-book-form" onSubmit={book}>
          {step === 1 && <>
            <div className="booking-step-heading"><h3>Booking details</h3><p>Check your dates and guests.</p></div>
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
            <ErrorBox message={availability.error} />
            <div className="room-detail-total"><span>{money(room.price_per_night)} × {nightCount} {nightCount === 1 ? 'night' : 'nights'}</span><strong>{money(Number(room.price_per_night) * nightCount)}</strong></div>
            <p className="room-detail-dates">{dateLabel(stay.checkIn)} – {dateLabel(stay.checkOut)}</p>
            <button type="button" className="room-book-button" disabled={availability.loading || !available} onClick={() => setStep(2)}>Continue</button>
          </>}
          {step === 2 && <>
            <div className="focused-step-header"><div className="booking-step-heading"><h3>Guest information</h3><p>Who should we contact about this stay?</p></div><div className="checkout-mini-summary"><span>{room.room_type}</span><strong>{money(total)}</strong><small>{dateLabel(stay.checkIn)} – {dateLabel(stay.checkOut)}</small></div></div>
            <div className="guest-details-form"><ContactFields value={contact} onChange={setContact} /></div>
            <div className="booking-step-actions"><button type="button" className="secondary" onClick={() => setStep(1)}>Back</button><button>Continue</button></div>
          </>}
          {step === 3 && <>
            <div className="booking-step-heading payment-heading"><h3>Review and payment</h3><p>Check your stay, then choose how you will pay.</p></div>
            <div className="payment-checkout-layout">
              <section className="checkout-review" aria-labelledby="stay-summary-title">
                <div className="checkout-section-title"><h4 id="stay-summary-title">Stay summary</h4><button type="button" onClick={() => setStep(1)}>Edit</button></div>
                <div className="checkout-review-row"><span>Room</span><strong>{room.room_type}</strong></div>
                <div className="checkout-review-row"><span>Check-in</span><strong>{dateLabel(stay.checkIn)}</strong></div>
                <div className="checkout-review-row"><span>Check-out</span><strong>{dateLabel(stay.checkOut)}</strong></div>
                <div className="checkout-review-row"><span>Guests</span><strong>{guests} {guests === 1 ? 'guest' : 'guests'}</strong></div>
                <div className="checkout-review-row"><span>{nightCount} {nightCount === 1 ? 'night' : 'nights'}</span><strong>{money(total)}</strong></div>
              </section>
              <section className="checkout-payment" aria-labelledby="payment-title">
                <h4 id="payment-title">Payment method</h4>
                <div className="payment-choice selected"><WalletCards size={22} /><div><strong>Pay at the property</strong><span>Nothing is charged today.</span></div><Check size={18} /></div>
                <div className="payment-methods" aria-label="Accepted payment methods"><span><CreditCard size={16} /> Card</span><span><Landmark size={16} /> Bank transfer</span><span><WalletCards size={16} /> Cash</span></div>
                <div className="payment-total"><span>Total due at property</span><strong>{money(total)}</strong></div>
                <p className="payment-note">Your reservation will be held for 15 minutes while you confirm it.</p>
              </section>
            </div>
            <div className="booking-step-actions payment-actions"><button type="button" className="secondary" onClick={() => setStep(2)}>Back</button><button type="button" onClick={() => setStep(4)}>Continue to confirmation</button></div>
          </>}
          {step === 4 && <>
            <div className="booking-step-heading confirmation-heading"><h3>Confirm your booking</h3><p>One last check before we hold your room.</p></div>
            <div className="confirmation-list">
              <div><span>Room</span><strong>{room.room_type}</strong></div>
              <div><span>Stay</span><strong>{dateLabel(stay.checkIn)} – {dateLabel(stay.checkOut)}</strong></div>
              <div><span>Guests</span><strong>{guests} {guests === 1 ? 'guest' : 'guests'}</strong></div>
              <div><span>Contact</span><strong>{contact.contact_name}<small>{contact.contact_email}<br />{contact.contact_phone}</small></strong></div>
              <div><span>Payment</span><strong>At the property</strong></div>
              <div className="total"><span>Total due at property</span><strong>{money(total)}</strong></div>
            </div>
            <ErrorBox message={error} />
            <div className="booking-step-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setStep(3)}>Back</button><button disabled={busy || !available}>{busy ? 'Holding your room…' : 'Confirm booking'}</button></div>
            <p className="muted small-text">Your room will be held for 15 minutes.</p>
          </>}
        </form> : <div className="room-book-form"><Link className="button room-book-button" to="/login" state={{ from: '/rooms' }}>Log in to book room</Link><Link to="/register">Create an account</Link></div>}
      </div>
    </div>
  </Modal>;
}
