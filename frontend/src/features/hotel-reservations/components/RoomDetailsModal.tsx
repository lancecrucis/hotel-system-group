import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Check, ChevronLeft, ChevronRight, Coffee, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { ErrorBox, Modal } from '../../../components/ui/common';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { HotelSettings, Reservation, Room } from '../../../types/models';
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

function timeLabel(value?: string) {
  if (!value) return '—';
  const [hour = '0', minute = '0'] = value.split(':');
  const date = new Date(Date.UTC(2000, 0, 1, Number(hour), Number(minute)));
  return new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

type PaymentMethod = 'property' | 'card' | 'gcash' | 'maya';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  property: 'Pay at the property',
  card: 'Credit or debit card',
  gcash: 'GCash',
  maya: 'Maya',
};

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
  const [agreements, setAgreements] = useState({ houseRules: false, privacy: false });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('property');
  const [contact, setContact] = useState<ContactDetails>({
    contact_name: user ? `${user.first_name} ${user.last_name}` : '',
    contact_email: user?.email ?? '',
    contact_phone: user?.phone_number.startsWith('+63') ? user.phone_number : '+63 ',
    special_requests: '',
  });
  const gallery = photos(room);
  const hasCompleteStay = Boolean(stay.checkIn && stay.checkOut && stay.checkOut > stay.checkIn);
  const checkOutLabel = stay.checkOut ? dateLabel(stay.checkOut) : 'Select check-out date';
  const nightCount = hasCompleteStay ? nights(stay.checkIn, stay.checkOut) : 0;
  const availabilityPath = hasCompleteStay
    ? `/hotel/rooms?${new URLSearchParams({ check_in: stay.checkIn, check_out: stay.checkOut, guests: String(guests) })}`
    : `/hotel/rooms?guests=${guests}`;
  const availability = useQuery<{ rooms: Room[] }>(availabilityPath);
  const settingsQuery = useQuery<{ settings: HotelSettings }>('/hotel/settings', 60000);
  const available = hasCompleteStay && Boolean(availability.data?.rooms.some((item) => item.id === room.id && item.available));
  const settings = settingsQuery.data?.settings;
  const taxRate = Number(settings?.tax_rate ?? 12);
  const serviceFeeRate = Number(settings?.service_fee_rate ?? 10);
  const subtotal = roundMoney(Number(room.price_per_night) * nightCount);
  const tax = roundMoney(subtotal * (taxRate / 100));
  const serviceFee = roundMoney(subtotal * (serviceFeeRate / 100));
  const total = roundMoney(subtotal + tax + serviceFee);

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 2) {
      if (!agreements.houseRules || !agreements.privacy) {
        setError('Please review and accept both guest acknowledgements before continuing.');
        return;
      }
      setError('');
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

  return <Modal title={created ? 'Reservation submitted' : step === 1 ? 'Room details' : step === 2 ? 'Guest information' : step === 3 ? 'Review your stay' : 'Confirm your booking'} className="max-w-[1040px] w-[calc(100%-2rem)] rounded-3xl border border-[#d8bfa0] bg-[#f8f1e7] p-6 text-[#54220e] shadow-[0_28px_90px_rgba(55,24,8,.28)] max-[760px]:rounded-2xl max-[760px]:p-4" onClose={() => { if (!busy) onClose(); }}>
    <div className={`${step > 1 ? 'block' : 'grid grid-cols-[minmax(0,1.35fr)_minmax(320px,.9fr)] gap-7 max-[760px]:grid-cols-1'}`}>
      {step === 1 && <div>
        <div className="relative overflow-hidden rounded-2xl bg-[#ead5b8] shadow-[0_10px_28px_rgba(84,34,14,.12)]">
          <img className="block h-[390px] w-full object-cover max-[760px]:h-[250px]" src={gallery[photo]} alt={`${room.room_type} view ${photo + 1} of ${gallery.length}`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} />
          {gallery.length > 1 && <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/70 bg-[#fffaf2]/95 px-1.5 py-1 text-xs font-semibold text-[#54220e] shadow-sm backdrop-blur">
            <button className="grid h-8 w-8 min-h-0 place-items-center rounded-full border-0 bg-transparent p-0 text-[#642c14] hover:bg-[#f3e1c7]" type="button" aria-label="Previous photo" onClick={() => setPhoto((photo - 1 + gallery.length) % gallery.length)}><ChevronLeft size={18} /></button>
            <span className="min-w-10 text-center">{photo + 1} / {gallery.length}</span>
            <button className="grid h-8 w-8 min-h-0 place-items-center rounded-full border-0 bg-transparent p-0 text-[#642c14] hover:bg-[#f3e1c7]" type="button" aria-label="Next photo" onClick={() => setPhoto((photo + 1) % gallery.length)}><ChevronRight size={18} /></button>
          </div>}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto px-0.5 pb-1" aria-label="Room photos">
          {gallery.map((image, index) => <button type="button" key={`${image}-${index}`} className={`h-[62px] w-[86px] shrink-0 overflow-hidden rounded-lg border-2 bg-[#ead5b8] p-0 transition-opacity ${photo === index ? 'border-[#642c14]' : 'border-transparent opacity-70 hover:opacity-100'}`} aria-label={`Show room photo ${index + 1}`} aria-pressed={photo === index} onClick={() => setPhoto(index)}><img className="h-full w-full object-cover" src={image} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} /></button>)}
        </div>
        <div className="pt-5">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#98785b]">La Illustrada Hotel</p><h3 className="m-0 font-['Gelasio'] text-[25px] font-normal leading-tight text-[#441901]">{room.room_type}</h3></div>
            <span className="shrink-0 rounded-full border border-[#e2d1bd] bg-[#fffaf2] px-3 py-1.5 text-[11px] font-semibold text-[#70462c]">Room {room.room_number}</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3e7d7] px-3 py-2 text-xs text-[#70462c]"><Users size={15} /> Up to {room.capacity}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3e7d7] px-3 py-2 text-xs text-[#70462c]"><BedDouble size={15} /> {room.bed_count} {room.bed_type}</span>
            {room.has_wifi && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3e7d7] px-3 py-2 text-xs text-[#70462c]"><Wifi size={15} /> Wi-Fi</span>}
            {room.breakfast_included && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3e7d7] px-3 py-2 text-xs text-[#70462c]"><Coffee size={15} /> Breakfast</span>}
          </div>
          {room.description && <p className="mb-0 text-sm leading-relaxed text-[#705742]">{room.description}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-label="Room details">
            {[
              ['Sleeps', `${room.capacity} ${room.capacity === 1 ? 'guest' : 'guests'}`],
              ['Bed setup', `${room.bed_count} ${room.bed_type}`],
              ['Internet', room.has_wifi ? 'Wi-Fi included' : 'Not included'],
              ['Breakfast', room.breakfast_included ? 'Included' : 'Not included'],
            ].map(([name, value]) => <div className="rounded-xl border border-[#e2d1bd] bg-[#fffaf2] px-3 py-2.5" key={name}><p className="m-0 text-[10px] font-semibold uppercase tracking-[.08em] text-[#98785b]">{name}</p><p className="m-0 mt-1 text-xs font-semibold text-[#54220e]">{value}</p></div>)}
          </div>
          {room.special_amenities && <div className="mt-3 rounded-xl border border-[#d8bfa0] bg-[#f3e7d7] p-3 text-sm leading-relaxed text-[#705742]"><strong className="font-semibold text-[#54220e]">Included in this room</strong><p className="m-0 mt-0.5">{room.special_amenities}</p></div>}
          <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-xl border border-[#e2d1bd] bg-[#fffaf2] p-3 text-xs sm:grid-cols-3">
            <div><p className="m-0 text-[#98785b]">Check-in</p><strong>{timeLabel(settings?.check_in_time)}</strong></div>
            <div><p className="m-0 text-[#98785b]">Check-out</p><strong>{timeLabel(settings?.check_out_time)}</strong></div>
            <div><p className="m-0 text-[#98785b]">Cancellation</p><strong>{settings?.cancellation_notice_hours ?? 24}h notice</strong></div>
          </div>
        </div>
      </div>}
      <div className={`self-start rounded-2xl border border-[#e2d1bd] bg-[#fffaf2] p-5 shadow-[0_8px_26px_rgba(84,34,14,.07)] max-[760px]:p-4 ${step > 1 ? 'mx-auto w-full max-w-[1020px] border-0 bg-transparent p-0 shadow-none' : ''}`}>
        {!created && <ol className="mb-6 grid list-none grid-cols-4 gap-0 p-0" aria-label="Booking progress">
          {['Booking', 'Guest', 'Payment', 'Confirmation'].map((name, index) => <li key={name} className={`flex flex-col items-center gap-2 text-center text-[#98785b] ${step >= index + 1 ? 'text-[#54220e]' : ''}`}><span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${step > index ? 'border-[#642c14] bg-[#642c14] text-[#fff8ee]' : step === index + 1 ? 'border-[#642c14] bg-[#f3e7d7] text-[#54220e]' : 'border-[#d8bfa0] bg-transparent'}`}>{step > index + 1 ? <Check size={13} /> : index + 1}</span><small className="text-[10px] font-semibold text-inherit">{name}</small></li>)}
        </ol>}
        {created ? <div className="flex flex-col items-center gap-3 text-center" role="status"><span className="grid h-14 w-14 place-items-center border border-[#642c14] bg-[#642c14] text-[#fff8ee]"><Check size={28} /></span><h3>Room reservation confirmed</h3><p>Reservation {created.reservation_reference} is confirmed. Open its details to view your stay and follow its progress.</p><Link className="inline-flex min-h-11 items-center justify-center border border-[#642c14] bg-[#642c14] px-[21px] py-[11px] font-semibold text-[#fff8ee] no-underline hover:bg-[#54220e]" to={`/reservations/${created.id}`}>View my reservation</Link></div> : user ? <form className="flex flex-col gap-2.5" onSubmit={book}>
          {step === 1 && <>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><h3 className="m-0 font-['Gelasio'] text-[22px] font-normal text-[#441901]">Your stay</h3><p className="mb-0 mt-1 text-xs text-[#806348]">Choose dates and guests</p></div>
              <div className="shrink-0 text-right"><strong className="font-['Gelasio'] text-[23px] font-normal tracking-[-.6px]">{money(room.price_per_night)}</strong><span className="ml-1 text-xs text-[#806348]">/ night</span></div>
            </div>
            <StayCalendar value={stay} onChange={setStay} />
            <label className="mt-4 flex flex-col gap-1.5 text-xs font-semibold text-[#70462c]">Guests
              <select className="min-h-11 rounded-xl border border-[#d8bfa0] bg-[#fffaf2] px-3 text-sm font-medium text-[#54220e] focus:border-[#8b4d28] focus:outline-none focus:ring-2 focus:ring-[#d8bfa0]/50" value={guests} onChange={(event) => setGuests(Number(event.target.value))}>
                {Array.from({ length: Math.min(6, room.capacity) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
              </select>
            </label>
            <div className={`mt-2 flex min-h-[30px] items-center gap-1.5 text-xs font-semibold ${available ? 'text-[#32744b]' : !hasCompleteStay ? 'text-[#806348]' : 'text-[#aa4136]'}`} role="status">
              {!hasCompleteStay ? 'Choose a check-out date to check availability' : availability.loading ? 'Checking availability…' : availability.error ? 'Could not check availability' : available ? <><Check size={16} /> Available for these dates</> : 'Unavailable for these dates'}
            </div>
            <ErrorBox message={availability.error} />
            <div className="mt-2 flex justify-between gap-2.5 border-t border-[#e3d6c7] pt-3 text-sm"><span className="text-[#806348]">Room subtotal · {money(room.price_per_night)} × {nightCount}</span><strong className="text-[#54220e]">{money(subtotal)}</strong></div>
            <p className="m-0 text-[11px] text-[#806348]">Estimated total with {taxRate}% VAT/room tax and {serviceFeeRate}% hotel service charge: <strong className="text-[#54220e]">{money(total)}</strong></p>
            <p className="my-0 text-[11px] text-[#806348]">{dateLabel(stay.checkIn)} – {checkOutLabel}</p>
            <button type="button" className="mt-2 w-full rounded-xl" disabled={!hasCompleteStay || availability.loading || !available} onClick={() => setStep(2)}>Continue</button>
          </>}
          {step === 2 && <>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(260px,.72fr)] items-start gap-5 max-[760px]:grid-cols-1">
              <section className="rounded-2xl border border-[#e2d1bd] bg-[#fffaf2] p-5 max-[500px]:p-4" aria-labelledby="guest-info-title">
                <h3 id="guest-info-title" className="m-0 font-['Gelasio'] text-[23px] font-normal text-[#441901]">Who’s checking in?</h3>
                <p className="mb-0 mt-1 text-sm text-[#806348]">Add the best contact details for this reservation.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 max-[500px]:grid-cols-1 [&_label]:text-xs [&_label]:font-semibold [&_label]:text-[#70462c] [&_input]:rounded-xl [&_textarea]:rounded-xl [&_textarea]:border-[#d8bfa0]">
                  <ContactFields value={contact} onChange={setContact} />
                </div>
                 <div className="mt-5 border-t border-[#e3d6c7] pt-5" aria-labelledby="guest-rules-title">
                   <div><h4 id="guest-rules-title" className="m-0 text-sm font-semibold text-[#54220e]">Guest rules and consent</h4><p className="mb-0 mt-1 text-xs leading-relaxed text-[#806348]">A few important reminders for stays in the Philippines.</p></div>
                   <div className="mt-3 flex flex-col gap-2.5">
                     <label className="flex items-start gap-2.5 rounded-xl border border-[#e2d1bd] bg-[#f8f1e7] p-3 text-xs font-normal leading-relaxed text-[#70462c]">
                       <input className="mt-0.5 h-4 w-4 shrink-0 accent-[#642c14]" type="checkbox" checked={agreements.houseRules} onChange={(event) => setAgreements((current) => ({ ...current, houseRules: event.target.checked }))} />
                       <span>I understand that all adult guests may be asked to present a valid government-issued photo ID at check-in. The guest count and names provided must be accurate and within the room capacity.</span>
                     </label>
                     <label className="flex items-start gap-2.5 rounded-xl border border-[#e2d1bd] bg-[#f8f1e7] p-3 text-xs font-normal leading-relaxed text-[#70462c]">
                       <input className="mt-0.5 h-4 w-4 shrink-0 accent-[#642c14]" type="checkbox" checked={agreements.privacy} onChange={(event) => setAgreements((current) => ({ ...current, privacy: event.target.checked }))} />
                       <span>I agree to the hotel rules, including no smoking or parties in the room, and accept responsibility for damage or extra charges. I consent to my information being used to manage this reservation under the Philippine Data Privacy Act of 2012.</span>
                     </label>
                   </div>
                 </div>
                 <ErrorBox message={error} />
              </section>
              <aside className="rounded-2xl border border-[#e2d1bd] bg-[#fffaf2] p-4" aria-label="Stay summary">
                <div className="flex items-center gap-3">
                  <img className="h-[68px] w-[78px] shrink-0 rounded-xl object-cover" src={room.image_url || roomImage(room)} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} />
                  <div className="min-w-0"><p className="mb-0 text-[10px] font-semibold uppercase tracking-[.1em] text-[#98785b]">Your room</p><h3 className="mb-0 mt-1 truncate font-sans text-sm font-semibold text-[#54220e]">{room.room_type}</h3><p className="mb-0 mt-1 text-xs text-[#806348]">Room {room.room_number}</p></div>
                </div>
                <div className="my-4 border-t border-[#e3d6c7]" />
                <dl className="m-0 flex flex-col gap-3 text-xs">
                  <div className="flex justify-between gap-3"><dt className="text-[#806348]">Check-in</dt><dd className="m-0 font-semibold text-[#54220e]">{dateLabel(stay.checkIn)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#806348]">Check-out</dt><dd className="m-0 font-semibold text-[#54220e]">{checkOutLabel}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#806348]">Guests</dt><dd className="m-0 font-semibold text-[#54220e]">{guests} {guests === 1 ? 'guest' : 'guests'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#806348]">Nights</dt><dd className="m-0 font-semibold text-[#54220e]">{nightCount}</dd></div>
                </dl>
                <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-[#e3d6c7] pt-3"><span className="text-xs text-[#806348]">Stay total</span><strong className="font-['Gelasio'] text-xl font-normal text-[#441901]">{money(total)}</strong></div>
              </aside>
            </div>
            <div className="mt-5 flex justify-end gap-3 max-[500px]:grid max-[500px]:grid-cols-2">
              <button type="button" className="min-h-11 rounded-xl border border-[#d8bfa0] bg-[#fffaf2] px-5 py-2.5 text-sm font-semibold text-[#54220e] hover:bg-[#f3e7d7]" onClick={() => setStep(1)}>Back</button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-2.5 text-sm text-[#fff8ee] hover:bg-[#54220e]" type="submit">Continue to payment <ArrowRight size={16} /></button>
            </div>
          </>}
          {step === 3 && <>
            <div className="mb-5"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#98785b]">Payment plan</p><h3 className="m-0 font-['Gelasio'] text-[25px] font-normal text-[#441901]">Review your stay</h3><p className="mb-0 mt-1 text-sm text-[#806348]">Choose how you want to settle the reservation.</p></div>
            <div className="grid grid-cols-[.9fr_1.1fr] gap-4 max-[760px]:grid-cols-1">
              <section className="rounded-2xl border border-[#e2d1bd] bg-[#fffaf2] p-5" aria-labelledby="stay-summary-title">
                <div className="mb-3 flex items-center justify-between gap-4"><h4 id="stay-summary-title" className="m-0 text-base font-semibold">Stay summary</h4><button type="button" className="min-h-0 border-0 bg-transparent p-1 text-xs font-semibold text-[#642c14] underline" onClick={() => setStep(1)}>Edit dates</button></div>
                <div className="mb-4 flex gap-3 rounded-xl bg-[#f3e7d7] p-3"><img className="h-16 w-20 shrink-0 rounded-lg object-cover" src={room.image_url || roomImage(room)} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} /><div className="min-w-0"><strong className="block truncate text-sm">{room.room_type}</strong><span className="text-xs text-[#806348]">Room {room.room_number} · {guests} {guests === 1 ? 'guest' : 'guests'}</span></div></div>
                <dl className="m-0 flex flex-col gap-3 text-xs">
                  <div className="flex items-start justify-between gap-3"><dt className="text-[#806348]">Check-in</dt><dd className="m-0 text-right font-semibold">{dateLabel(stay.checkIn)}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-[#806348]">Check-out</dt><dd className="m-0 text-right font-semibold">{checkOutLabel}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-[#806348]">Length of stay</dt><dd className="m-0 text-right font-semibold">{nightCount} {nightCount === 1 ? 'night' : 'nights'}</dd></div>
                </dl>
              </section>
              <section className="rounded-2xl border border-[#e2d1bd] bg-[#fffaf2] p-5" aria-labelledby="payment-title">
                <h4 id="payment-title" className="m-0 text-base font-semibold">Choose a payment method</h4>
                <div className="mt-3 flex flex-col gap-2.5">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition-colors ${paymentMethod === 'property' ? 'border-[#642c14] bg-[#f3e7d7]' : 'border-[#d8bfa0] bg-[#fffaf2] hover:bg-[#f8f1e7]'}`}>
                    <input className="mt-0.5 h-4 w-4 shrink-0 accent-[#642c14]" type="radio" name="payment_method" value="property" checked={paymentMethod === 'property'} onChange={() => setPaymentMethod('property')} />
                    <span><strong className="block text-[#54220e]">Pay at the property</strong><span className="mt-0.5 block leading-relaxed text-[#806348]">Settle by cash, card, or bank transfer at check-in. Nothing is charged online.</span></span>
                  </label>
                  <div className="rounded-xl border border-dashed border-[#d8bfa0] bg-[#f8f1e7] p-3 text-xs text-[#806348]">
                    <strong className="text-[#70462c]">Pay online</strong>
                    <p className="mb-2 mt-1 leading-relaxed">Choose a method to preview the payment experience. This prototype does not charge or store payment details.</p>
                    <div className="grid grid-cols-3 gap-2" aria-label="Online payment methods">
                      {(['card', 'gcash', 'maya'] as const).map((method) => <label className={`flex min-h-9 cursor-pointer items-center justify-center rounded-lg border px-2 text-[11px] font-semibold transition-colors ${paymentMethod === method ? 'border-[#642c14] bg-[#f3e1c7] text-[#54220e]' : 'border-[#d8bfa0] bg-[#fffaf2] text-[#806348] hover:bg-[#f3e7d7]'}`} key={method}><input className="sr-only" type="radio" name="online_payment_method" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />{paymentMethodLabels[method]}</label>)}
                    </div>
                  </div>
                </div>
                <div className="mb-4 mt-4 rounded-xl border border-[#d8bfa0] bg-[#f3e7d7] p-3 text-xs"><p className="m-0 leading-relaxed"><strong className="text-[#54220e]">Demo payment only.</strong><br />The selected method is saved for this booking preview; no payment is captured or sent to a provider.</p></div>
                <dl className="m-0 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between gap-3"><dt className="text-[#806348]">Room rate × {nightCount} {nightCount === 1 ? 'night' : 'nights'}</dt><dd className="m-0 font-semibold">{money(subtotal)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#806348]">VAT / room tax ({taxRate}%)</dt><dd className="m-0 font-semibold">{money(tax)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#806348]">Hotel service charge ({serviceFeeRate}%)</dt><dd className="m-0 font-semibold">{money(serviceFee)}</dd></div>
                </dl>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#d8bfa0] pt-4"><div><p className="m-0 text-[10px] font-semibold uppercase tracking-[.1em] text-[#98785b]">Total due at property</p><p className="m-0 mt-1 text-[11px] text-[#806348]">Philippine pesos</p></div><strong className="font-['Gelasio'] text-2xl font-normal text-[#441901]">{money(total)}</strong></div>
              </section>
            </div>
            <div className="ml-auto mt-[18px] grid max-w-[470px] grid-cols-[.65fr_1.35fr] gap-[9px]"><button type="button" className="secondary" onClick={() => setStep(2)}>Back</button><button type="button" onClick={() => setStep(4)}>Continue to confirmation</button></div>
          </>}
          {step === 4 && <>
            <div className="mb-5"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#98785b]">Final review</p><h3 className="m-0 font-['Gelasio'] text-[27px] font-normal text-[#441901]">Confirm your booking</h3><p className="mb-0 mt-1 text-sm text-[#806348]">Check the details below before we reserve the room.</p></div>
            <div className="grid grid-cols-[1.1fr_.9fr] gap-4 max-[760px]:grid-cols-1">
              <section className="rounded-2xl border border-[#e2d1bd] bg-[#fffaf2] p-5" aria-labelledby="confirmation-details-title">
                <div className="mb-4 flex gap-3"><img className="h-20 w-24 shrink-0 rounded-xl object-cover" src={room.image_url || roomImage(room)} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = roomImage(room); }} /><div className="min-w-0"><p className="m-0 text-[10px] font-semibold uppercase tracking-[.1em] text-[#98785b]">La Illustrada Hotel</p><h4 id="confirmation-details-title" className="m-0 mt-1 truncate text-base font-semibold text-[#54220e]">{room.room_type}</h4><p className="m-0 mt-1 text-xs text-[#806348]">Room {room.room_number}</p></div></div>
                <dl className="m-0 flex flex-col gap-3 border-t border-[#e3d6c7] pt-4 text-xs">
                  <div className="flex items-start justify-between gap-4"><dt className="text-[#806348]">Stay</dt><dd className="m-0 text-right font-semibold">{dateLabel(stay.checkIn)} – {checkOutLabel}<small className="block mt-0.5 font-normal text-[#806348]">{nightCount} {nightCount === 1 ? 'night' : 'nights'} · {guests} {guests === 1 ? 'guest' : 'guests'}</small></dd></div>
                  <div className="flex items-start justify-between gap-4"><dt className="text-[#806348]">Guest contact</dt><dd className="m-0 text-right font-semibold">{contact.contact_name}<small className="block mt-0.5 font-normal text-[#806348]">{contact.contact_email}<br />{contact.contact_phone}</small></dd></div>
                  <div className="flex items-start justify-between gap-4"><dt className="text-[#806348]">Payment</dt><dd className="m-0 text-right font-semibold">{paymentMethodLabels[paymentMethod]}<small className="block mt-0.5 font-normal text-[#806348]">Demo selection · no charge</small></dd></div>
                </dl>
              </section>
              <aside className="flex flex-col rounded-2xl bg-[#54220e] p-5 text-[#fff8ee]" aria-label="Final payment summary">
                <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#e6b67f]">Reservation total</div>
                <p className="mb-0 mt-3 font-['Gelasio'] text-[37px] font-normal leading-none">{money(total)}</p>
                <p className="mb-5 mt-2 text-xs leading-relaxed text-[#ead7c2]">Demo payment selection: {paymentMethodLabels[paymentMethod]}. No real charge is made. This includes the room subtotal, {taxRate}% VAT/room tax, and {serviceFeeRate}% hotel service charge.</p>
                <div className="mt-auto border-t border-[#a06a47] pt-4 text-xs text-[#ead7c2]"><div className="flex justify-between gap-3"><span>Room subtotal</span><span>{money(subtotal)}</span></div><div className="mt-2 flex justify-between gap-3"><span>Taxes & service</span><span>{money(tax + serviceFee)}</span></div></div>
              </aside>
            </div>
            <ErrorBox message={error} />
            <div className="mt-5 grid grid-cols-[.65fr_1.35fr] gap-[9px]"><button type="button" className="secondary" disabled={busy} onClick={() => setStep(3)}>Back</button><button disabled={busy || !available}>{busy ? 'Confirming your room…' : 'Confirm booking'}</button></div>
            <p className="m-0 text-center text-xs text-[#806348]">By confirming, you agree to the guest rules and reservation details shown above.</p>
          </>}
        </form> : <div className="flex flex-col gap-2.5"><Link className="inline-flex min-h-11 w-full items-center justify-center border border-[#642c14] bg-[#642c14] px-[21px] py-[11px] font-semibold text-[#fff8ee] no-underline hover:bg-[#54220e]" to="/login" state={{ from: '/rooms' }}>Log in to book room</Link><Link to="/register">Create an account</Link></div>}
      </div>
    </div>
  </Modal>;
}
