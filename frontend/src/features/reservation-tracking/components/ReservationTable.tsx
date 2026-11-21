import { Link } from 'react-router-dom';
import type { Reservation } from '../../../types/models';
import { Badge, Empty } from '../../../components/ui/common';
import { dateLabel, money } from '../../../utils/format';
export function ReservationTable({ reservations }: { reservations: Reservation[] }) {
  if (!reservations.length) return <Empty title="No reservations" />;
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse bg-[#fffaf2] text-left text-xs">
        <thead>
          <tr>
            <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Reference / guest</th>
            <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Reservation</th>
            <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Schedule</th>
            <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Status</th>
            <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Total</th>
            <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id} className="border-b border-[#eadfce] last:border-b-0">
              <td className="align-top px-5 py-4 text-[#54220e]">
                <Link className="font-semibold tracking-[.3px] text-[#9d421c]" to={`/reservations/${r.id}`}>
                  {r.reservation_reference}
                </Link>
                <small className="mt-1 block text-xs text-[#806348]">{r.contact_name}</small>
              </td>
              <td className="align-top px-5 py-4 text-[#54220e]">
                {r.hotel ? `Room ${r.hotel.room_number}` : 'Restaurant'}
                <small className="mt-1 block text-xs text-[#806348]">{r.hotel?.room_type ?? `${r.restaurant?.guest_count} guests`}</small>
              </td>
              <td className="align-top px-5 py-4 text-[#54220e]">
                {dateLabel(r.hotel?.check_in ?? r.restaurant!.reservation_date)}
                <small className="mt-1 block text-xs text-[#806348]">
                  {r.hotel
                    ? `to ${dateLabel(r.hotel.check_out)}`
                    : `${r.restaurant!.start_time.slice(0, 5)}–${r.restaurant!.end_time.slice(0, 5)}`}
                </small>
              </td>
              <td className="align-top px-5 py-4">
                <Badge status={r.status} />
              </td>
              <td className="align-top px-5 py-4 font-semibold text-[#54220e]">{r.reservation_type === 'hotel' ? money(r.total_amount) : 'Dining'}</td>
              <td className="align-top px-5 py-4 text-right">
                <Link className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#d8bfa0] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#642c14] transition-colors hover:border-[#9b6a43] hover:bg-[#f7ecdc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28]" to={`/reservations/${r.id}`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
