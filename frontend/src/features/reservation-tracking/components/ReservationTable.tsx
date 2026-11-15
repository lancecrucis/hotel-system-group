import { Link } from 'react-router-dom';
import type { Reservation } from '../../../types/models';
import { Badge, Empty } from '../../../components/ui/common';
import { dateLabel, money } from '../../../utils/format';
export function ReservationTable({ reservations }: { reservations: Reservation[] }) {
  if (!reservations.length) return <Empty title="No reservations" />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference / guest</th>
            <th>Reservation</th>
            <th>Schedule</th>
            <th>Status</th>
            <th>Total</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id}>
              <td>
                <Link className="reference" to={`/reservations/${r.id}`}>
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
                <Link className="button secondary small" to={`/reservations/${r.id}`}>
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
