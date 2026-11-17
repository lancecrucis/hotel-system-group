import { Link } from 'react-router-dom';
import { LogIn, LogOut, BedDouble, UtensilsCrossed, Clock, Wallet, Plus } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import type { Reservation } from '../../../types/models';
import { PageHeader, ErrorBox, Loading } from '../../../components/ui/common';
import { ReservationTable } from '../components/ReservationTable';
import { money } from '../../../utils/format';
interface Summary {
  pending: number;
  arrivals: number;
  departures: number;
  in_house: number;
  diners: number;
  receipts: string;
  today: string;
}
export function Overview() {
  const stats = useQuery<{ summary: Summary }>('/dashboard', 30000),
    bookings = useQuery<{ reservations: Reservation[] }>('/reservations', 30000),
    s = stats.data?.summary;
  const cards = [
    { name: 'Arrivals today', value: s?.arrivals, icon: LogIn },
    { name: 'Departures due', value: s?.departures, icon: LogOut },
    { name: 'Guests in-house', value: s?.in_house, icon: BedDouble },
    { name: 'Dining covers today', value: s?.diners, icon: UtensilsCrossed },
    { name: 'Awaiting confirmation', value: s?.pending, icon: Clock },
    { name: 'Net receipts today', value: s ? money(s.receipts) : undefined, icon: Wallet },
  ];
  const today =
    bookings.data?.reservations.filter(
      (r) =>
        ['confirmed', 'checked_in', 'arrived', 'seated'].includes(r.status) &&
        (r.hotel
          ? r.hotel.check_in === s?.today ||
            (r.status === 'checked_in' && r.hotel.check_out <= (s?.today ?? ''))
          : r.restaurant?.reservation_date === s?.today),
    ) ?? [];
  return (
    <>
      <PageHeader
        title="Today"
        action={
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#161616] bg-[#161616] px-[21px] py-[11px] font-semibold text-white no-underline hover:bg-[#363636]" to="/walk-in">
            <Plus size={17} />
            New walk-in
          </Link>
        }
      />
      <ErrorBox message={stats.error || bookings.error} />
      <div className="grid grid-cols-3 gap-4 max-[800px]:grid-cols-2 max-[500px]:gap-2.5">
        {cards.map((c) => (
          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#e8e8e8] bg-white p-5 max-[500px]:p-[15px]">
            <div>
              <span className="text-xs text-[#6e6e6e]">{c.name}</span>
              <strong className="block text-[30px] font-semibold tracking-[-.7px] max-[500px]:text-[25px]">{c.value ?? '—'}</strong>
            </div>
            <c.icon size={21} />
          </div>
        ))}
      </div>
      <div className="my-9 flex items-center justify-between gap-4">
        <h2>Today’s service</h2>
        <Link to="/reservations">View all reservations →</Link>
      </div>
      <div className="overflow-hidden rounded-[20px] border border-[#e8e8e8] bg-white p-0">
        {bookings.loading && !bookings.data ? <Loading /> : <ReservationTable reservations={today} />}
      </div>
      <div className="my-9 flex items-center justify-between gap-4">
        <h2>Recent bookings</h2>
      </div>
      <div className="overflow-hidden rounded-[20px] border border-[#e8e8e8] bg-white p-0">
        <ReservationTable reservations={bookings.data?.reservations.slice(0, 6) ?? []} />
      </div>
    </>
  );
}
