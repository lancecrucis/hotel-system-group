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
        className="grid grid-cols-[minmax(190px,1.15fr)_minmax(330px,2fr)_minmax(145px,.8fr)_auto] items-stretch gap-2.5 rounded-[22px] border border-[#e8e8e8] bg-[#f1f1f1] p-3 max-[1200px]:grid-cols-2 max-[800px]:grid-cols-2 max-[500px]:grid-cols-1"
        onSubmit={(e) => {
          e.preventDefault();
          setDateOpen(false);
          setSearch({ ...filters });
          query.reload();
        }}
      >
        <label className="flex min-h-[72px] min-w-0 items-center gap-[13px] rounded-[14px] border border-[#e5e5e5] bg-white px-[15px] py-[11px] max-[500px]:min-h-16">
          <BedDouble size={20} aria-hidden="true" />
          <span className="relative flex min-w-0 flex-1 flex-col">
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
            <ChevronDown className="pointer-events-none absolute bottom-2 right-0 text-[#515151]" size={16} aria-hidden="true" />
          </span>
        </label>
        <div className="relative flex min-h-[72px] min-w-0 items-center gap-[13px] rounded-[14px] border border-[#e5e5e5] bg-white px-[15px] py-[11px] max-[500px]:min-h-16">
          <CalendarDays size={20} aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span>Check-in & check-out</span>
            <button type="button" className="flex min-h-[26px] w-full items-center justify-between border-0 bg-transparent p-0 text-[13px] font-semibold text-[#1d1d1d]" aria-expanded={dateOpen} aria-label="Choose check-in and check-out dates" onClick={() => setDateOpen(!dateOpen)}>{dateLabel(filters.check_in)} <span className="mx-1.5 text-[#6e6e6e]" aria-hidden="true">→</span> {dateLabel(filters.check_out)} <ChevronDown size={16} /></button>
          </div>
          {dateOpen && <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-[min(370px,90vw)] rounded-[18px] border border-[#e8e8e8] bg-white p-3.5 shadow-[0_18px_50px_#0002]"><StayCalendar value={{ checkIn: filters.check_in, checkOut: filters.check_out }} onChange={(value) => setFilters({ ...filters, check_in: value.checkIn, check_out: value.checkOut })} /><button type="button" className="mt-3 w-full" onClick={() => setDateOpen(false)}>Done</button></div>}
        </div>
        <label className="flex min-h-[72px] min-w-0 items-center gap-[13px] rounded-[14px] border border-[#e5e5e5] bg-white px-[15px] py-[11px] max-[500px]:min-h-16">
          <Users size={20} aria-hidden="true" />
          <span className="relative flex min-w-0 flex-1 flex-col">
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
            <ChevronDown className="pointer-events-none absolute bottom-2 right-0 text-[#515151]" size={16} aria-hidden="true" />
          </span>
        </label>
        <button className="min-h-[72px] whitespace-nowrap rounded-[14px] max-[500px]:min-h-16" disabled={query.loading}>
          Find a room <Search size={18} />
        </button>
      </form>
      <div className="my-9 flex items-center justify-between gap-4">
        <h1 className="m-0 text-[25px] font-semibold tracking-[-.8px]">Available rooms</h1>
        <span className="text-[#6e6e6e]">{query.data?.rooms.filter((r) => r.available).length ?? 0} rooms</span>
      </div>
      <ErrorBox message={query.error} />
      {query.loading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-3 gap-6 max-[1200px]:grid-cols-2 max-[500px]:grid-cols-1">
          {query.data?.rooms
            .filter((r) => r.available)
            .map((room) => (
              <article className="overflow-hidden rounded-[22px] border border-[#e8e8e8] bg-white shadow-[0_2px_8px_#00000003] transition hover:border-[#cecece] hover:shadow-[0_6px_24px_#00000008]" key={room.id}>
                <img
                  className="h-[176px] w-full object-cover"
                  src={room.image_url || roomImage(room)}
                  alt={`${room.room_type}, room ${room.room_number}`}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = roomImage(room);
                  }}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex-1 text-lg font-semibold tracking-[-.4px]">{room.room_type}</h3>
                  </div>
                  <div className="my-[17px] flex flex-wrap items-center gap-x-[13px] gap-y-[9px] text-[11px] text-[#797979]">
                    <span className="flex items-center gap-[5px]">
                      <Users size={15} />
                      {room.capacity} guests
                    </span>
                    <span className="flex items-center gap-[5px]">
                      <BedDouble size={15} />
                      {room.bed_count} {room.bed_type}
                    </span>
                    {room.has_wifi && (
                      <span className="flex items-center gap-[5px]">
                        <Wifi size={15} />
                        Wi-Fi
                      </span>
                    )}
                    {room.breakfast_included && (
                      <span className="flex items-center gap-[5px]">
                        <Coffee size={15} />
                        Breakfast
                      </span>
                    )}
                  </div>
                  <div className="mt-[18px] flex items-center justify-between gap-2.5 border-t border-[#e8e8e8] pt-[17px]">
                    <span>
                      <strong className="text-[23px] font-semibold tracking-[-.7px]">{money(room.price_per_night)}</strong>
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
