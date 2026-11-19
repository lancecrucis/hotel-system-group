import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Check, ChevronLeft, ChevronRight, Coffee, Users, WalletCards, Wifi } from 'lucide-react';
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

  return <Modal title={created ? 'Reservation submitted' : step === 1 ? room.room_type : 'Complete your booking'} className="max-w-[1100px] w-[calc(100%-34px)] border border-[#c8a783] bg-[#f3e1c7] p-7 text-[#54220e] max-[760px]:p-[17px]" onClose={() => { if (!busy) onClose(); }}>
    <div className={`${step > 1 ? 'block' : 'grid grid-cols-[minmax(0,1.35fr)_minmax(320px,.9fr)] gap-7 max-[760px]:grid-cols-1'}`}>
      {step === 1 && <div>
        <div className="relative overflow-hidden border border-[#d8bfa0] bg-[#ead5b8]">
          <img className="block h-[340px] w-full object-cover max-[760px]:h-[250px]" src={gallery[photo]} alt={`${room.room_type} view ${photo + 1} of ${gallery.length}`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} />
          {gallery.length > 1 && <div className="absolute bottom-3.5 right-3.5 flex items-center gap-[9px] border border-[#c8a783] bg-[#fff8ee]/95 p-[5px] text-xs font-semibold">
            <button className="min-h-0 border-0 bg-transparent p-1.5 text-[#642c14]" type="button" aria-label="Previous photo" onClick={() => setPhoto((photo - 1 + gallery.length) % gallery.length)}><ChevronLeft size={20} /></button>
            <span>{photo + 1} / {gallery.length}</span>
            <button className="min-h-0 border-0 bg-transparent p-1.5 text-[#642c14]" type="button" aria-label="Next photo" onClick={() => setPhoto((photo + 1) % gallery.length)}><ChevronRight size={20} /></button>
          </div>}
        </div>
        <div className="mt-2.5 flex gap-[9px] overflow-x-auto p-0.5" aria-label="Room photos">
          {gallery.map((image, index) => <button type="button" key={`${image}-${index}`} className={`h-[60px] w-[82px] shrink-0 overflow-hidden border-2 bg-[#ead5b8] p-0 ${photo === index ? 'border-[#642c14]' : 'border-[#d8bfa0]'}`} aria-label={`Show room photo ${index + 1}`} aria-pressed={photo === index} onClick={() => setPhoto(index)}><img className="h-full w-full object-cover" src={image} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} /></button>)}
        </div>
        <div className="pt-[18px]">
          <h3>Room details</h3>
          <div className="mb-4 flex flex-wrap gap-[9px]">
            <span className="inline-flex items-center gap-1.5 border border-[#d8bfa0] px-2.5 py-[7px] text-xs"><Users size={17} /> Up to {room.capacity} guests</span>
            <span className="inline-flex items-center gap-1.5 border border-[#d8bfa0] px-2.5 py-[7px] text-xs"><BedDouble size={17} /> {room.bed_count} {room.bed_type}</span>
            {room.has_wifi && <span className="inline-flex items-center gap-1.5 border border-[#d8bfa0] px-2.5 py-[7px] text-xs"><Wifi size={17} /> Wi-Fi</span>}
            {room.breakfast_included && <span className="inline-flex items-center gap-1.5 border border-[#d8bfa0] px-2.5 py-[7px] text-xs"><Coffee size={17} /> Breakfast included</span>}
          </div>
          {room.description && <p>{room.description}</p>}
          {room.special_amenities && <p>{room.special_amenities}</p>}
        </div>
      </div>}
      <div className={`self-start border border-[#d8bfa0] bg-[#fff8ee] p-5 ${step > 1 ? 'mx-auto w-full max-w-[1020px] border-0 bg-transparent p-0' : ''}`}>
        {!created && <ol className="mb-6 grid list-none grid-cols-4 gap-0 p-0" aria-label="Booking progress">
          {['Booking', 'Guest', 'Payment', 'Confirmation'].map((name, index) => <li key={name} className={`flex flex-col items-center gap-2 text-center text-[#806348] ${step >= index + 1 ? 'text-[#54220e]' : ''}`}><span className={`grid h-9 w-9 place-items-center border-2 text-sm font-bold ${step > index ? 'border-[#642c14] bg-[#642c14] text-[#fff8ee]' : 'border-[#c8a783] bg-[#f3e1c7]'}`}>{step > index + 1 ? <Check size={13} /> : index + 1}</span><small className="font-semibold text-inherit">{name}</small></li>)}
        </ol>}
        {created ? <div className="flex flex-col items-center gap-3 text-center" role="status"><span className="grid h-14 w-14 place-items-center border border-[#642c14] bg-[#642c14] text-[#fff8ee]"><Check size={28} /></span><h3>Your room is held</h3><p>Reservation {created.reservation_reference} is awaiting confirmation. Open its details to confirm it and follow its progress.</p><Link className="inline-flex min-h-11 items-center justify-center border border-[#642c14] bg-[#642c14] px-[21px] py-[11px] font-semibold text-[#fff8ee] no-underline hover:bg-[#54220e]" to={`/reservations/${created.id}`}>View my reservation</Link></div> : user ? <form className="flex flex-col gap-2.5" onSubmit={book}>
          {step === 1 && <>
            <div><h3>Booking details</h3><p>Check your dates and guests.</p></div>
          <div className="mb-4"><strong className="font-['Gelasio'] text-[23px] font-normal tracking-[-.6px]">{money(room.price_per_night)}</strong><span className="text-[#806348]"> / night</span></div>
            <StayCalendar value={stay} onChange={setStay} />
            <label className="mt-3">Guests
              <select value={guests} onChange={(event) => setGuests(Number(event.target.value))}>
                {Array.from({ length: Math.min(6, room.capacity) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
              </select>
            </label>
            <div className="mt-2.5 flex min-h-[30px] items-center gap-1.5 text-xs font-semibold" role="status">
              {availability.loading ? 'Checking availability…' : availability.error ? 'Could not check availability' : available ? <><Check size={16} /> Available for these dates</> : 'Unavailable for these dates'}
            </div>
            <ErrorBox message={availability.error} />
            <div className="flex justify-between gap-2.5 border-t border-[#d8bfa0] pt-[13px]"><span>{money(room.price_per_night)} × {nightCount} {nightCount === 1 ? 'night' : 'nights'}</span><strong>{money(Number(room.price_per_night) * nightCount)}</strong></div>
            <p className="my-[3px] mb-[18px] text-[11px] text-[#806348]">{dateLabel(stay.checkIn)} – {dateLabel(stay.checkOut)}</p>
            <button type="button" className="mt-[5px] w-full" disabled={availability.loading || !available} onClick={() => setStep(2)}>Continue</button>
          </>}
          {step === 2 && <>
            <div className="flex items-start justify-between gap-6 border-b border-[#d8bfa0] pb-[17px] max-[760px]:block"><div><h3>Guest information</h3><p>Who should we contact about this stay?</p></div><div className="grid min-w-[250px] grid-cols-2 gap-x-[22px] gap-y-0 text-right max-[760px]:mt-3 max-[760px]:text-left"><span className="col-span-2 text-xs font-semibold">{room.room_type}</span><strong className="text-[17px]">{money(total)}</strong><small className="col-span-2 text-[#806348]">{dateLabel(stay.checkIn)} – {dateLabel(stay.checkOut)}</small></div></div>
            <div className="grid grid-cols-2 gap-[13px] pt-3 max-[760px]:grid-cols-1"><ContactFields value={contact} onChange={setContact} /></div>
            <div className="grid grid-cols-[.65fr_1.35fr] gap-[9px]"><button type="button" className="secondary" onClick={() => setStep(1)}>Back</button><button>Continue</button></div>
          </>}
          {step === 3 && <>
            <div className="mb-5 text-center"><h3>Review and payment</h3><p>Check your stay, then choose how you will pay.</p></div>
            <div className="grid grid-cols-[.9fr_1.1fr] gap-4 max-[760px]:grid-cols-1">
              <section className="border border-[#d8bfa0] bg-[#fff8ee] p-[21px]" aria-labelledby="stay-summary-title">
                <div className="mb-2.5 flex items-center justify-between gap-4"><h4 id="stay-summary-title">Stay summary</h4><button type="button" className="min-h-0 border-0 bg-transparent p-1 text-xs underline" onClick={() => setStep(1)}>Edit</button></div>
                {[['Room', room.room_type], ['Check-in', dateLabel(stay.checkIn)], ['Check-out', dateLabel(stay.checkOut)], ['Guests', `${guests} ${guests === 1 ? 'guest' : 'guests'}`], [`${nightCount} ${nightCount === 1 ? 'night' : 'nights'}`, money(total)]].map(([name, value]) => <div className="flex items-start justify-between gap-3 border-b border-[#d8bfa0] py-2.5 text-xs last:border-b-0" key={name}><span className="text-[#806348]">{name}</span><strong className="text-right">{value}</strong></div>)}
              </section>
              <section className="border border-[#d8bfa0] bg-[#fff8ee] p-[21px]" aria-labelledby="payment-title">
                <h4 id="payment-title">Payment method</h4>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-[#642c14] bg-[#f3e1c7] p-[15px]"><WalletCards size={22} /><div className="flex flex-col"><strong>Pay at the property</strong><span className="text-[11px] text-[#806348]">Nothing is charged today.</span></div><Check size={18} /></div>
                <div className="my-5 flex flex-wrap gap-[7px]" aria-label="Accepted payment methods"><span className="border border-[#d8bfa0] px-[9px] py-1.5 text-[11px] text-[#806348]">Card</span><span className="border border-[#d8bfa0] px-[9px] py-1.5 text-[11px] text-[#806348]">Bank transfer</span><span className="border border-[#d8bfa0] px-[9px] py-1.5 text-[11px] text-[#806348]">Cash</span></div>
                <div className="flex items-baseline justify-between border-y border-[#d8bfa0] py-[15px]"><span>Total due at property</span><strong className="font-['Gelasio'] text-xl font-normal">{money(total)}</strong></div>
                <p className="mt-2.5 text-left text-[11px] text-[#806348]">Your reservation will be held for 15 minutes while you confirm it.</p>
              </section>
            </div>
            <div className="ml-auto mt-[18px] grid max-w-[470px] grid-cols-[.65fr_1.35fr] gap-[9px]"><button type="button" className="secondary" onClick={() => setStep(2)}>Back</button><button type="button" onClick={() => setStep(4)}>Continue to confirmation</button></div>
          </>}
          {step === 4 && <>
            <div className="mb-5 text-center"><h3>Confirm your booking</h3><p>One last check before we hold your room.</p></div>
            <div className="border-t border-[#d8bfa0]">
              <div><span>Room</span><strong>{room.room_type}</strong></div>
              <div><span>Stay</span><strong>{dateLabel(stay.checkIn)} – {dateLabel(stay.checkOut)}</strong></div>
              <div><span>Guests</span><strong>{guests} {guests === 1 ? 'guest' : 'guests'}</strong></div>
              <div><span>Contact</span><strong>{contact.contact_name}<small>{contact.contact_email}<br />{contact.contact_phone}</small></strong></div>
              <div><span>Payment</span><strong>At the property</strong></div>
              <div className="flex justify-between gap-3 border-b border-[#d8bfa0] px-1 py-[13px] font-semibold"><span>Total due at property</span><strong>{money(total)}</strong></div>
            </div>
            <ErrorBox message={error} />
            <div className="mt-2.5 grid grid-cols-[.65fr_1.35fr] gap-[9px]"><button type="button" className="secondary" disabled={busy} onClick={() => setStep(3)}>Back</button><button disabled={busy || !available}>{busy ? 'Holding your room…' : 'Confirm booking'}</button></div>
            <p className="text-xs text-[#806348]">Your room will be held for 15 minutes.</p>
          </>}
        </form> : <div className="flex flex-col gap-2.5"><Link className="inline-flex min-h-11 w-full items-center justify-center border border-[#642c14] bg-[#642c14] px-[21px] py-[11px] font-semibold text-[#fff8ee] no-underline hover:bg-[#54220e]" to="/login" state={{ from: '/rooms' }}>Log in to book room</Link><Link to="/register">Create an account</Link></div>}
      </div>
    </div>
  </Modal>;
}
