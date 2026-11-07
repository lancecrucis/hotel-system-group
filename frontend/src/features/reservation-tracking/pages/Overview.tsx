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
          <Link className="button" to="/rooms">
            <Plus size={17} />
            New reservation
          </Link>
        }
      />
      <ErrorBox message={stats.error || bookings.error} />
      <div className="stats-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.name}>
            <div>
              <span className="muted">{c.name}</span>
              <strong>{c.value ?? '—'}</strong>
            </div>
            <c.icon size={21} />
          </div>
        ))}
      </div>
      <div className="section-heading">
        <h2>Today’s service</h2>
        <Link to="/reservations">View all reservations →</Link>
      </div>
      <div className="panel flush">
        {bookings.loading && !bookings.data ? <Loading /> : <ReservationTable reservations={today} />}
      </div>
      <div className="section-heading">
        <h2>Recent bookings</h2>
      </div>
      <div className="panel flush">
        <ReservationTable reservations={bookings.data?.reservations.slice(0, 6) ?? []} />
      </div>
    </>
  );
}
