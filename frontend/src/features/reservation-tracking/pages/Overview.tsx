import { Link } from 'react-router-dom';
import { LogIn, LogOut, BedDouble, UtensilsCrossed, Clock, Wallet, Plus, Sparkles } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import type { Reservation } from '../../../types/models';
import { PageHeader, ErrorBox, Loading } from '../../../components/ui/common';
import { ReservationTable } from '../components/ReservationTable';
import { dateLabel, money } from '../../../utils/format';
interface Summary {
  pending: number;
  arrivals: number;
  departures: number;
  in_house: number;
  diners: number;
  receipts: string;
  needs_cleaning: number;
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
    { name: 'Rooms needing cleaning', value: s?.needs_cleaning, icon: Sparkles, to: '/housekeeping' },
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
    <div className="space-y-9">
      <PageHeader
        title="Operations dashboard"
        action={
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-2.5 text-sm font-semibold text-[#fff8ee] no-underline transition-colors hover:bg-[#54220e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28]" to="/walk-in">
            <Plus size={17} aria-hidden="true" />
            New walk-in booking
          </Link>
        }
      />
      <ErrorBox message={stats.error || bookings.error} />
      <section aria-label="Today's summary">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-[#98785b]">Today’s operations</p>
            <h2 className="m-0 !font-sans text-xl !font-semibold tracking-[-.025em] text-[#54220e]">Operations summary</h2>
          </div>
          {s?.today && <span className="pb-1 text-sm text-[#806348]">{dateLabel(s.today)}</span>}
        </div>
        <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-3 max-[900px]:grid-cols-2 max-[500px]:gap-2.5">
          {cards.map((c) => {
            const body = (
              <>
                <span className="block max-w-[150px] text-xs font-semibold leading-snug text-[#70462c]">{c.name}</span>
                <strong className="mt-3 block font-['Gelasio'] text-[30px] font-normal tracking-[-.4px] text-[#441901] max-[500px]:mt-2 max-[500px]:text-[25px]">{c.value ?? '—'}</strong>
                <span className="mt-1 block text-[11px] font-medium text-[#9b6a43]">{c.to ? 'View housekeeping →' : ''}</span>
              </>
            );
            const inner = (
              <span className="flex min-h-[122px] w-full items-start justify-between gap-3 rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-5 shadow-[0_8px_24px_rgba(84,34,14,.055)] max-[500px]:min-h-[112px] max-[500px]:p-4">
                <span className="min-w-0">{body}</span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f3e1c7] text-[#a64b1c]">
                  <c.icon size={20} aria-hidden="true" />
                </span>
              </span>
            );
            return c.to ? (
              <Link key={c.name} to={c.to} className="no-underline text-inherit">
                {inner}
              </Link>
            ) : (
              <div key={c.name}>{inner}</div>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="today-service-heading">
        <div className="mb-4 flex items-end justify-between gap-4 max-[500px]:items-start max-[500px]:flex-col">
          <div>
            <p className="mb-1 text-sm font-medium text-[#98785b]">Service desk</p>
            <h2 id="today-service-heading" className="m-0 !font-sans text-xl !font-semibold tracking-[-.025em] text-[#54220e]">Today’s service</h2>
          </div>
          <Link className="pb-1 text-sm font-semibold text-[#8b3b24] underline decoration-[#c1844c] underline-offset-4 hover:text-[#54220e]" to="/reservations">View all reservations</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_10px_28px_rgba(84,34,14,.06)]">
          {bookings.loading && !bookings.data ? <Loading /> : <ReservationTable reservations={today} />}
        </div>
      </section>
      <section aria-labelledby="recent-bookings-heading">
        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-[#98785b]">Latest activity</p>
          <h2 id="recent-bookings-heading" className="m-0 !font-sans text-xl !font-semibold tracking-[-.025em] text-[#54220e]">Recent reservations</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_10px_28px_rgba(84,34,14,.06)]">
          <ReservationTable reservations={bookings.data?.reservations.slice(0, 6) ?? []} />
        </div>
      </section>
    </div>
  );
}
