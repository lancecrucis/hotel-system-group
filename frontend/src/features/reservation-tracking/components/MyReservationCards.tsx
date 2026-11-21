import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, BedDouble, Clock3, UsersRound } from 'lucide-react';
import type { Reservation } from '../../../types/models';
import { Badge, Empty } from '../../../components/ui/common';
import { dateLabel, money } from '../../../utils/format';

function displayTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function MyReservationCards({ reservations }: { reservations: Reservation[] }) {
  if (!reservations.length)
    return (
      <Empty title="No reservations yet">
        <p className="mx-auto mb-5 mt-2 max-w-[390px] text-sm leading-relaxed text-[#806348]">
          Your hotel stays and restaurant bookings will appear here once you reserve.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#642c14] px-5 py-2.5 text-sm font-semibold text-[#fff8ee] no-underline hover:bg-[#54220e]" to="/rooms">
            Browse rooms
          </Link>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d8bfa0] bg-[#fffdf9] px-5 py-2.5 text-sm font-semibold text-[#642c14] no-underline hover:bg-[#f7ecdc]" to="/dining">
            Reserve dining
          </Link>
        </div>
      </Empty>
    );

  return (
    <section aria-label="Your reservations">
      <p className="mb-3 text-sm text-[#806348]">
        {reservations.length} {reservations.length === 1 ? 'reservation' : 'reservations'}
      </p>
      <div className="grid gap-4">
        {reservations.map((reservation) => {
          const hotel = reservation.reservation_type === 'hotel';
          const title = hotel ? reservation.hotel?.room_type ?? 'Hotel stay' : 'Restaurant reservation';
          const image = hotel
            ? reservation.hotel?.image_url || '/images/landing/hero-800.webp'
            : '/images/restaurant.webp';
          const schedule = hotel
            ? `${dateLabel(reservation.hotel!.check_in)} – ${dateLabel(reservation.hotel!.check_out)}`
            : dateLabel(reservation.restaurant!.reservation_date);

          return (
            <article key={reservation.id} className="group grid overflow-hidden rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] transition-colors hover:border-[#c8a783] sm:grid-cols-[210px_minmax(0,1fr)]">
              <div className="relative min-h-[170px] overflow-hidden bg-[#eadbc8] sm:min-h-[205px]">
                <img
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                  src={image}
                  alt={hotel ? `${title}, room ${reservation.hotel!.room_number}` : 'Hotel restaurant dining room'}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/images/landing/hero-800.webp';
                  }}
                />
                <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-[#fffaf2]/95 px-3 py-1.5 text-xs font-semibold text-[#54220e] shadow-sm">
                  {hotel ? 'Hotel stay' : 'Dining'}
                </span>
              </div>

              <div className="flex min-w-0 flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium tracking-[.04em] text-[#98785b]">{reservation.reservation_reference}</span>
                  <Badge status={reservation.status} />
                </div>

                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="m-0 font-['Gelasio'] text-[25px] font-normal leading-tight text-[#441901]">
                      {title}
                    </h2>
                    <p className="mb-0 mt-1.5 text-sm text-[#806348]">
                      {hotel
                        ? `Room ${reservation.hotel!.room_number}`
                        : `For ${reservation.restaurant!.guest_count} ${reservation.restaurant!.guest_count === 1 ? 'guest' : 'guests'}`}
                    </p>
                  </div>
                  {hotel && <strong className="shrink-0 font-['Gelasio'] text-lg font-normal text-[#441901]">{money(reservation.total_amount)}</strong>}
                </div>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#70462c]">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={16} className="shrink-0 text-[#9b6a43]" aria-hidden="true" />
                    <span>
                      <span className="mr-1.5 text-xs text-[#98785b]">{hotel ? 'Stay' : 'Dining date'}</span>
                      {schedule}
                    </span>
                  </span>
                  {hotel ? (
                    <span className="inline-flex items-center gap-2">
                      <BedDouble size={16} className="shrink-0 text-[#9b6a43]" aria-hidden="true" />
                      {reservation.hotel!.guest_count} {reservation.hotel!.guest_count === 1 ? 'guest' : 'guests'}
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-2">
                        <Clock3 size={16} className="shrink-0 text-[#9b6a43]" aria-hidden="true" />
                        {displayTime(reservation.restaurant!.start_time)}–{displayTime(reservation.restaurant!.end_time)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <UsersRound size={16} className="shrink-0 text-[#9b6a43]" aria-hidden="true" />
                        {reservation.restaurant!.guest_count} {reservation.restaurant!.guest_count === 1 ? 'guest' : 'guests'}
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-auto flex justify-end pt-5">
                  <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d8bfa0] bg-[#fffdf9] px-4 py-2 text-sm font-semibold text-[#642c14] no-underline transition-colors hover:border-[#9b6a43] hover:bg-[#f7ecdc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28]" to={`/reservations/${reservation.id}`}>
                    View details <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
