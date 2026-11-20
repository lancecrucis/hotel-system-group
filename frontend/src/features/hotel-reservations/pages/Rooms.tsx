import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Users, CalendarDays, Search, ChevronDown, Star } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { useQuery } from '../../../hooks/useQuery';
import type { Reservation, Room } from '../../../types/models';
import { ErrorBox, Empty, Loading } from '../../../components/ui/common';
import { RoomDetailsModal } from '../components/RoomDetailsModal';
import { StayCalendar } from '../components/StayCalendar';
import { day, dateLabel, label, money } from '../../../utils/format';

function roomImage(room: Room) {
  const roomSpecificImages: Record<string, string> = {
    '101': '/images/rooms/deluxe-king.webp',
    '102': '/images/rooms/deluxe-twin.webp',
    '103': '/images/rooms/deluxe-king-view.png',
    '201': '/images/rooms/executive-suite-view.png',
    '202': '/images/rooms/deluxe-twin-view.png',
    '301': '/images/rooms/family-suite-view.png',
    '302': '/images/rooms/family-suite.webp',
    '401': '/images/rooms/executive-suite.webp',
    '104': '/images/rooms/garden-queen-104.png',
    '203': '/images/rooms/balcony-king-203.png',
    '204': '/images/rooms/deluxe-twin-204.png',
    '303': '/images/rooms/junior-suite-303.png',
  };
  if (roomSpecificImages[room.room_number]) return roomSpecificImages[room.room_number];
  const type = room.room_type.toLowerCase();
  if (type.includes('executive')) return '/images/rooms/executive-suite.webp';
  if (type.includes('family')) return '/images/rooms/family-suite.webp';
  if (type.includes('twin') || room.bed_count > 1) return '/images/rooms/deluxe-twin.webp';
  return '/images/rooms/deluxe-king.webp';
}

function RoomCard({ room, onSelect }: { room: Room; onSelect: (room: Room) => void }) {
  return (
    <article className="group min-w-0" key={room.id}>
      <div className="relative overflow-hidden rounded-2xl bg-[#eadfce]">
        <img
          className="aspect-[1.3/1] w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          src={room.image_url || roomImage(room)}
          alt={`${room.room_type}, room ${room.room_number}`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = roomImage(room);
          }}
        />
        <span
          className="absolute right-3 top-3 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#fffaf2]/95 px-3 text-xs font-medium text-[#3d291f] shadow-sm backdrop-blur-sm"
          aria-label={room.rating_count ? `${room.rating.toFixed(1)} out of 5 stars from ${room.rating_count} reviews` : 'No ratings yet'}
        >
          <Star size={13} className={room.rating_count ? 'fill-[#a65f25] text-[#a65f25]' : 'text-[#806f63]'} aria-hidden="true" />
          {room.rating_count ? <>{room.rating.toFixed(1)} <span className="text-[#806f63]">({room.rating_count})</span></> : 'New'}
        </span>
      </div>
      <div className="pt-3 font-sans text-[13px] leading-snug text-[#70462c]">
        <h3 className="m-0 truncate font-sans text-[15px] font-semibold tracking-[-.01em] text-[#3d291f]">{room.room_type}</h3>
        <p className="mb-0 mt-1 truncate text-[13px] text-[#806f63]">{room.capacity} guests · {room.bed_count} {room.bed_type}{room.has_wifi ? ' · Wi-Fi' : ''}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="m-0 text-[#3d291f]"><strong className="font-sans text-[15px] font-semibold">{money(room.price_per_night)}</strong><span className="ml-1 text-xs text-[#705f50]">per night</span></p>
          <button className="min-h-9 shrink-0 rounded-full border border-[#70432b] bg-transparent px-4 font-sans text-xs font-semibold text-[#54220e] transition-colors hover:bg-[#70432b] hover:text-[#fff8ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28]" onClick={() => onSelect(room)}>
            View room
          </button>
        </div>
      </div>
    </article>
  );
}

function RoomSection({ title, subtitle, rooms, onSelect }: { title: string; subtitle: string; rooms: Room[]; onSelect: (room: Room) => void }) {
  if (!rooms.length) return null;
  return (
    <section className="mt-9" aria-label={title}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="m-0 !font-sans text-xl !font-semibold tracking-[-.025em] text-[#54220e]">{title}</h2>
          <p className="mb-0 mt-1 text-sm text-[#806348]">{subtitle}</p>
        </div>
        <span className="pb-1 text-xs text-[#70462c]">{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</span>
      </div>
      <div className="grid grid-cols-3 gap-x-5 gap-y-8 max-[1200px]:grid-cols-2 max-[500px]:grid-cols-1">
        {rooms.map((room) => <RoomCard key={room.id} room={room} onSelect={onSelect} />)}
      </div>
    </section>
  );
}

export function Rooms() {
  const { user } = useAuth();
  const initial = { room_type: '', check_in: day(1), check_out: day(2), guests: '2' };
  const [filters, setFilters] = useState(initial),
    [search, setSearch] = useState(initial),
    [selected, setSelected] = useState<Room | null>(null),
    [dateOpen, setDateOpen] = useState(false);
  const query = useQuery<{ rooms: Room[]; room_types: string[] }>(`/hotel/rooms?${new URLSearchParams(search)}`);
  const bookings = useQuery<{ reservations: Reservation[] }>('/reservations?type=hotel', 30000);
  const today = day();
  const currentBooking = user?.role === 'customer'
    ? bookings.data?.reservations.find((reservation) =>
        reservation.hotel &&
        ['pending', 'confirmed', 'checked_in'].includes(reservation.status) &&
        reservation.hotel.check_out >= today,
      )
    : undefined;
  const availableRooms = query.data?.rooms.filter((room) => room.available) ?? [];
  const suites = availableRooms.filter((room) => room.room_type.toLowerCase().includes('suite'));
  const nonSuites = availableRooms.filter((room) => !room.room_type.toLowerCase().includes('suite'));
  const roomSections = [
    {
      title: 'Great for two',
      subtitle: 'Comfortable stays for couples and solo travelers',
      rooms: nonSuites.filter((room) => room.capacity === 2),
    },
    {
      title: 'Room to share',
      subtitle: 'Extra beds and space for family or friends',
      rooms: nonSuites.filter((room) => room.capacity >= 3),
    },
    {
      title: 'Suites with extra space',
      subtitle: 'Roomier layouts for a longer, slower stay',
      rooms: suites,
    },
  ];
  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#f9f3e7]">
      <form
        className="grid grid-cols-[minmax(155px,1fr)_minmax(270px,1.5fr)_minmax(140px,.8fr)_minmax(155px,auto)] items-center gap-2.5 rounded-2xl border border-[#63351f] bg-[#54220e] p-2.5 shadow-[0_8px_22px_rgba(84,34,14,.13)] max-[900px]:grid-cols-2 max-[500px]:grid-cols-2 max-[500px]:gap-2 max-[380px]:grid-cols-1"
        onSubmit={(e) => {
          e.preventDefault();
          setDateOpen(false);
          setSearch({ ...filters });
          query.reload();
        }}
      >
        <label className="flex min-h-[56px] min-w-0 flex-row items-center gap-2.5 rounded-xl border border-[#eadfce] bg-[#fffaf2] px-3.5 py-2 transition-colors focus-within:border-[#d18a4c] focus-within:ring-2 focus-within:ring-[#e7aa70]/30 max-[500px]:col-span-full">
          <BedDouble className="shrink-0 text-[#70432b]" size={18} aria-hidden="true" />
          <span className="relative flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-sans text-[10px] font-medium leading-tight text-[#806348]">Room type</span>
            <select
              className="!min-h-6 !border-0 !bg-transparent !p-0 !pr-5 font-sans text-[13px] font-medium !text-[#54220e] !shadow-none appearance-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none"
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
            <ChevronDown className="pointer-events-none absolute bottom-1 right-0 text-[#806348]" size={15} aria-hidden="true" />
          </span>
        </label>
        <div className="relative flex min-h-[56px] min-w-0 items-center gap-2.5 rounded-xl border border-[#eadfce] bg-[#fffaf2] px-3.5 py-2 transition-colors focus-within:border-[#d18a4c] max-[500px]:col-span-full">
          <CalendarDays className="shrink-0 text-[#70432b]" size={18} aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-sans text-[10px] font-medium leading-tight text-[#806348]">Stay dates</span>
            <button type="button" className="flex min-h-6 w-full items-center justify-between gap-1 border-0 bg-transparent p-0 text-left font-sans text-[12px] font-medium text-[#54220e] focus-visible:outline-2 focus-visible:outline-[#8b4d28]" aria-expanded={dateOpen} aria-label={`Choose check-in ${dateLabel(filters.check_in)} and check-out ${dateLabel(filters.check_out)}`} onClick={() => setDateOpen(!dateOpen)}><span className="flex min-w-0 flex-col truncate"><span className="text-[9px] font-normal text-[#806348]">Check-in</span><span className="truncate">{dateLabel(filters.check_in)}</span></span><span className="px-1 text-[#a87652]" aria-hidden="true">→</span><span className="flex min-w-0 flex-col truncate"><span className="text-[9px] font-normal text-[#806348]">Check-out</span><span className="truncate">{dateLabel(filters.check_out)}</span></span><ChevronDown className="shrink-0 text-[#806348]" size={15} /></button>
          </div>
          {dateOpen && <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-[min(370px,calc(100vw-2rem))] border border-[#c8a783] bg-[#f3e1c7] p-3.5 shadow-[0_18px_50px_rgba(55,24,8,.18)] max-[500px]:left-1/2 max-[500px]:-translate-x-1/2"><StayCalendar value={{ checkIn: filters.check_in, checkOut: filters.check_out }} onChange={(value) => setFilters((current) => ({ ...current, check_in: value.checkIn, check_out: value.checkOut }))} /><button type="button" className="mt-3 w-full" onClick={() => setDateOpen(false)}>Done</button></div>}
        </div>
        <label className="flex min-h-[56px] min-w-0 flex-row items-center gap-2.5 rounded-xl border border-[#eadfce] bg-[#fffaf2] px-3.5 py-2 transition-colors focus-within:border-[#d18a4c] focus-within:ring-2 focus-within:ring-[#e7aa70]/30">
          <Users className="shrink-0 text-[#70432b]" size={18} aria-hidden="true" />
          <span className="relative flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-sans text-[10px] font-medium leading-tight text-[#806348]">Guests</span>
            <select
              className="!min-h-6 !border-0 !bg-transparent !p-0 !pr-5 font-sans text-[13px] font-medium !text-[#54220e] !shadow-none appearance-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none"
              value={filters.guests}
              onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
            >
              {Array.from({ length: 6 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? 'guest' : 'guests'}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-1 right-0 text-[#806348]" size={15} aria-hidden="true" />
          </span>
        </label>
        <button className="flex min-h-[56px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#d18a4c] bg-[#d18a4c] px-5 font-sans text-[13px] font-semibold text-[#54220e] shadow-sm transition hover:border-[#e3a366] hover:bg-[#e3a366] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff8ee] disabled:cursor-wait disabled:opacity-70" disabled={query.loading}>
          <span>Find a room</span><Search size={17} aria-hidden="true" />
        </button>
      </form>
      <div className="my-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="m-0 !font-sans text-2xl !font-semibold tracking-[-.03em] text-[#54220e]">{currentBooking ? 'Your current booking' : 'Find your stay'}</h1>
          {!currentBooking && <p className="mb-0 mt-1 text-sm text-[#806348]">Choose a room that suits your trip</p>}
        </div>
        <span className="pb-1 text-sm text-[#70462c]">{availableRooms.length} {availableRooms.length === 1 ? 'room' : 'rooms'}</span>
      </div>
      {currentBooking && <section className="-mt-2 mb-7 rounded-xl border border-[#d8bfa0] bg-[#fffaf2] p-4 text-sm text-[#70462c] sm:flex sm:items-center sm:justify-between sm:gap-5" aria-label="Current hotel booking">
        <div className="min-w-0">
          <h2 className="m-0 !font-sans text-base !font-semibold text-[#54220e]">{currentBooking.hotel!.room_type} · Room {currentBooking.hotel!.room_number}</h2>
          <p className="mb-0 mt-1">{dateLabel(currentBooking.hotel!.check_in)} – {dateLabel(currentBooking.hotel!.check_out)} · {currentBooking.hotel!.guest_count} {currentBooking.hotel!.guest_count === 1 ? 'guest' : 'guests'}</p>
          <p className="mb-0 mt-1">Reservation <Link className="font-semibold text-[#54220e] underline" to={`/reservations/${currentBooking.id}`}>{currentBooking.reservation_reference}</Link></p>
        </div>
        <span className="mt-3 inline-flex shrink-0 rounded-full bg-[#eadfce] px-3 py-1 text-xs font-semibold text-[#54220e] sm:mt-0">{label(currentBooking.status)}</span>
      </section>}
      <ErrorBox message={query.error} />
      {query.loading ? (
        <Loading />
      ) : (
        <div>
          {roomSections.map((section) => <RoomSection key={section.title} {...section} onSelect={setSelected} />)}
        </div>
      )}
      {!query.loading && !query.error && availableRooms.length === 0 && (
        <Empty title="No rooms available" />
      )}
      {selected && <RoomDetailsModal key={selected.id} room={selected} initialStay={{ checkIn: search.check_in, checkOut: search.check_out }} initialGuests={Number(search.guests)} onClose={() => setSelected(null)} />}
    </div>
  );
}
