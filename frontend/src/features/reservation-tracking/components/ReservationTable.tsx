import { Link } from 'react-router-dom';
import type { Reservation } from '../../../types/models';
import { Badge, Empty } from '../../../components/ui/common';
import { dateLabel, money } from '../../../utils/format';
export function ReservationTable({ reservations }: { reservations: Reservation[] }) {
  if (!reservations.length) return <Empty title="No reservations" />;
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="whitespace-nowrap bg-[#fcfcfc] px-5 py-[17px] text-[10px] font-semibold uppercase tracking-[.6px] text-[#888]">Reference / guest</th>
            <th className="whitespace-nowrap bg-[#fcfcfc] px-5 py-[17px] text-[10px] font-semibold uppercase tracking-[.6px] text-[#888]">Reservation</th>
            <th className="whitespace-nowrap bg-[#fcfcfc] px-5 py-[17px] text-[10px] font-semibold uppercase tracking-[.6px] text-[#888]">Schedule</th>
            <th className="whitespace-nowrap bg-[#fcfcfc] px-5 py-[17px] text-[10px] font-semibold uppercase tracking-[.6px] text-[#888]">Status</th>
            <th className="whitespace-nowrap bg-[#fcfcfc] px-5 py-[17px] text-[10px] font-semibold uppercase tracking-[.6px] text-[#888]">Total</th>
            <th className="whitespace-nowrap bg-[#fcfcfc] px-5 py-[17px] text-[10px] font-semibold uppercase tracking-[.6px] text-[#888]">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id}>
              <td>
                <Link className="text-[11px] font-semibold tracking-[.3px]" to={`/reservations/${r.id}`}>
                  {r.reservation_reference}
                </Link>
                <small>{r.contact_name}</small>
              </td>
              <td>
                {r.hotel ? `Room ${r.hotel.room_number}` : 'Restaurant'}
                <small>{r.hotel?.room_type ?? `${r.restaurant?.guest_count} guests`}</small>
              </td>
              <td>
                {dateLabel(r.hotel?.check_in ?? r.restaurant!.reservation_date)}
                <small>
                  {r.hotel
                    ? `to ${dateLabel(r.hotel.check_out)}`
                    : `${r.restaurant!.start_time.slice(0, 5)}–${r.restaurant!.end_time.slice(0, 5)}`}
                </small>
              </td>
              <td>
                <Badge status={r.status} />
              </td>
              <td>{r.reservation_type === 'hotel' ? money(r.total_amount) : 'Dining'}</td>
              <td>
                <Link className="inline-flex min-h-[34px] items-center justify-center rounded-full border border-[#dedede] bg-white px-3 py-[7px] text-xs font-semibold text-[#1d1d1d]" to={`/reservations/${r.id}`}>
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
