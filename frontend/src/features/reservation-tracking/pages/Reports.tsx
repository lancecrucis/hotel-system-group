import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import type { Reservation, Payment } from '../../../types/models';
import { PageHeader, Badge, ErrorBox, Loading, Empty } from '../../../components/ui/common';
import { money, dateLabel, label, day } from '../../../utils/format';

interface ReportSummary {
  hotel_by_status: { status: string; count: number }[];
  restaurant_by_status: { status: string; count: number }[];
  hotel_totals: {
    bookings: number;
    room_nights: number;
    subtotal: string;
    tax: string;
    service_fee: string;
    total: string;
    paid: string;
    refunded: string;
    net: string;
  };
  restaurant_totals: {
    bookings: number;
    covers: number;
    completed: number;
    no_show: number;
    cancelled: number;
  };
  payments: { method: string; count: number; amount: string }[];
  daily: { day: string; hotel_bookings: number; restaurant_bookings: number; covers: number; payments: string }[];
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function reservationRows(reservations: Reservation[]) {
  return [
    ['Reference', 'Type', 'Status', 'Guest', 'Contact email', 'Total', 'Created', 'Detail'],
    ...reservations.map((r) => [
      r.reservation_reference,
      r.reservation_type,
      r.status,
      r.contact_name,
      r.contact_email,
      r.total_amount,
      r.created_at,
      r.reservation_type === 'hotel'
        ? `${r.hotel?.check_in ?? ''} to ${r.hotel?.check_out ?? ''} · room ${r.hotel?.room_number ?? ''}`
        : `${r.restaurant?.reservation_date ?? ''} ${r.restaurant?.start_time?.slice(0, 5) ?? ''} · ${r.restaurant?.guest_count ?? ''} guests`,
    ]),
  ];
}

export function Reports() {
  const [from, setFrom] = useState(() => day(-30));
  const [to, setTo] = useState(() => day());
  const [applied, setApplied] = useState({ from, to });

  const summaryQuery = useQuery<ReportSummary>(
    `/reports/summary?from=${applied.from}&to=${applied.to}`,
  );
  const reservationsQuery = useQuery<{ reservations: Reservation[] }>(
    `/reports/reservations?from=${applied.from}&to=${applied.to}`,
  );
  const paymentsQuery = useQuery<{ payments: (Payment & { reservation_reference: string; reservation_type: string })[] }>(
    `/reports/payments?from=${applied.from}&to=${applied.to}`,
  );

  const summary = summaryQuery.data;
  const reservations = reservationsQuery.data?.reservations ?? [];
  const payments = paymentsQuery.data?.payments ?? [];
  const loading = summaryQuery.loading || reservationsQuery.loading || paymentsQuery.loading;
  const error = summaryQuery.error || reservationsQuery.error || paymentsQuery.error;

  const statusRows = useMemo(() => {
    if (!summary) return [];
    const hotel = summary.hotel_by_status.map((s) => ['Hotel', label(s.status), s.count]);
    const restaurant = summary.restaurant_by_status.map((s) => ['Restaurant', label(s.status), s.count]);
    return [['Service', 'Status', 'Bookings'], ...hotel, ...restaurant];
  }, [summary]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        action={
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-2.5 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!summary || loading}
            onClick={() => {
              downloadCsv(`status-summary-${applied.from}-to-${applied.to}.csv`, statusRows);
            }}
          >
            <Download size={16} /> Export status CSV
          </button>
        }
      />
      <p className="-mt-4 max-w-[680px] text-sm leading-relaxed text-[#806348]">
        Operational reports for hotel and dining reservations, payments, and daily activity.
        Defaults to the last 30 days.
      </p>

      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-4 shadow-[0_8px_24px_rgba(84,34,14,.055)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (from > to) return;
          setApplied({ from, to });
        }}
      >
        <label className="text-xs font-semibold text-[#70462c]">
          From
          <input
            type="date"
            className="mt-1 min-h-11 rounded-xl border border-[#ddcbb5] bg-[#fffdf9] px-3 py-2 text-sm text-[#54220e]"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold text-[#70462c]">
          To
          <input
            type="date"
            className="mt-1 min-h-11 rounded-xl border border-[#ddcbb5] bg-[#fffdf9] px-3 py-2 text-sm text-[#54220e]"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </label>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-2.5 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e]">
          Apply range
        </button>
        <span className="pb-1 text-xs text-[#806348]">
          Showing {dateLabel(applied.from)} – {dateLabel(applied.to)}
        </span>
      </form>

      <ErrorBox message={error} />
      {loading && !summary ? <Loading /> : null}

      {summary && (
        <>
          <section aria-label="Hotel summary" className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
            {[
              { name: 'Hotel bookings', value: summary.hotel_totals.bookings },
              { name: 'Room-nights sold', value: summary.hotel_totals.room_nights },
              { name: 'Room revenue (gross)', value: money(summary.hotel_totals.total) },
              { name: 'Payments recorded', value: money(summary.hotel_totals.paid) },
              { name: 'Refunds recorded', value: money(summary.hotel_totals.refunded) },
              { name: 'Net collected', value: money(summary.hotel_totals.net) },
            ].map((card) => (
              <div key={card.name} className="min-h-[110px] rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-5 shadow-[0_8px_24px_rgba(84,34,14,.055)]">
                <span className="block max-w-[160px] text-xs font-semibold leading-snug text-[#70462c]">{card.name}</span>
                <strong className="mt-3 block font-['Gelasio'] text-[26px] font-normal tracking-[-.3px] text-[#441901]">
                  {typeof card.value === 'number' ? card.value : card.value}
                </strong>
              </div>
            ))}
          </section>

          <section aria-label="Restaurant summary" className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
            {[
              { name: 'Dining bookings', value: summary.restaurant_totals.bookings },
              { name: 'Covers (guests)', value: summary.restaurant_totals.covers },
              { name: 'Completed visits', value: summary.restaurant_totals.completed },
              { name: 'No-shows', value: summary.restaurant_totals.no_show },
              { name: 'Cancelled', value: summary.restaurant_totals.cancelled },
              { name: 'Payment records', value: payments.length },
            ].map((card) => (
              <div key={card.name} className="min-h-[110px] rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-5 shadow-[0_8px_24px_rgba(84,34,14,.055)]">
                <span className="block max-w-[160px] text-xs font-semibold leading-snug text-[#70462c]">{card.name}</span>
                <strong className="mt-3 block font-['Gelasio'] text-[26px] font-normal tracking-[-.3px] text-[#441901]">{card.value}</strong>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_8px_24px_rgba(84,34,14,.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#eadfce] p-5">
              <div>
                <p className="mb-1 text-sm font-medium text-[#98785b]">Breakdown</p>
                <h2 className="m-0 !font-sans text-lg !font-semibold text-[#54220e]">Bookings by status</h2>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {['Service', 'Status', 'Bookings'].map((h) => (
                      <th key={h} className="whitespace-nowrap bg-[#f3e1c7] px-5 py-3 text-xs font-semibold text-[#54220e]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statusRows.slice(1).map((row, i) => (
                    <tr key={`${row[0]}-${row[1]}-${i}`} className="border-b border-[#eadfce] last:border-b-0">
                      <td className="px-5 py-3 text-[#70462c]">{row[0]}</td>
                      <td className="px-5 py-3"><Badge status={String(row[1]).toLowerCase().replace(/\s+/g, '_')} /></td>
                      <td className="px-5 py-3 font-semibold text-[#54220e]">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_8px_24px_rgba(84,34,14,.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eadfce] p-5">
          <div>
            <p className="mb-1 text-sm font-medium text-[#98785b]">Range detail</p>
            <h2 className="m-0 !font-sans text-lg !font-semibold text-[#54220e]">Reservations in range</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#d8bfa0] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#642c14] hover:bg-[#f7ecdc] disabled:opacity-50"
              disabled={!reservations.length}
              onClick={() => downloadCsv(`reservations-${applied.from}-to-${applied.to}.csv`, reservationRows(reservations))}
            >
              <Download size={14} /> Reservations CSV
            </button>
            <button
              type="button"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#d8bfa0] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#642c14] hover:bg-[#f7ecdc] disabled:opacity-50"
              disabled={!payments.length}
              onClick={() =>
                downloadCsv(`payments-${applied.from}-to-${applied.to}.csv`, [
                  ['Reference', 'Type', 'Reservation', 'Amount', 'Method', 'Status', 'Paid at'],
                  ...payments.map((p) => [
                    p.transaction_reference,
                    p.reservation_type,
                    p.reservation_reference,
                    p.amount,
                    p.payment_method,
                    p.payment_status,
                    p.paid_at,
                  ]),
                ])
              }
            >
              <Download size={14} /> Payments CSV
            </button>
          </div>
        </div>
        {reservationsQuery.loading && !reservationsQuery.data ? (
          <Loading />
        ) : reservations.length === 0 ? (
          <Empty title="No reservations in this range" />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-xs">
              <thead>
                <tr>
                  {['Reference', 'Type', 'Status', 'Guest', 'Total', 'Detail'].map((h) => (
                    <th key={h} className="whitespace-nowrap bg-[#f3e1c7] px-5 py-3 text-xs font-semibold text-[#54220e]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.slice(0, 200).map((r) => (
                  <tr key={r.id} className="border-b border-[#eadfce] last:border-b-0">
                    <td className="px-5 py-3 font-semibold text-[#54220e]">{r.reservation_reference}</td>
                    <td className="px-5 py-3 text-[#70462c]">{label(r.reservation_type)}</td>
                    <td className="px-5 py-3"><Badge status={r.status} /></td>
                    <td className="px-5 py-3 text-[#70462c]">{r.contact_name}</td>
                    <td className="px-5 py-3 font-semibold text-[#54220e]">{r.reservation_type === 'hotel' ? money(r.total_amount) : '—'}</td>
                    <td className="px-5 py-3 text-[#806348]">
                      {r.reservation_type === 'hotel'
                        ? `${dateLabel(r.hotel!.check_in)} – ${dateLabel(r.hotel!.check_out)} · ${r.hotel!.room_number}`
                        : `${dateLabel(r.restaurant!.reservation_date)} · ${r.restaurant!.start_time.slice(0, 5)} · ${r.restaurant!.guest_count} pax`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_8px_24px_rgba(84,34,14,.06)]">
        <div className="border-b border-[#eadfce] p-5">
          <p className="mb-1 text-sm font-medium text-[#98785b]">Money</p>
          <h2 className="m-0 !font-sans text-lg !font-semibold text-[#54220e]">Payments in range</h2>
        </div>
        {paymentsQuery.loading && !paymentsQuery.data ? (
          <Loading />
        ) : payments.length === 0 ? (
          <Empty title="No payments recorded in this range" />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr>
                  {['Reservation', 'Amount', 'Method', 'Status', 'Reference', 'Paid at'].map((h) => (
                    <th key={h} className="whitespace-nowrap bg-[#f3e1c7] px-5 py-3 text-xs font-semibold text-[#54220e]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 200).map((p) => (
                  <tr key={p.id} className="border-b border-[#eadfce] last:border-b-0">
                    <td className="px-5 py-3 font-semibold text-[#54220e]">{p.reservation_reference}</td>
                    <td className="px-5 py-3 font-semibold text-[#54220e]">{money(p.amount)}</td>
                    <td className="px-5 py-3 text-[#70462c]">{label(p.payment_method)}</td>
                    <td className="px-5 py-3"><Badge status={p.payment_status} /></td>
                    <td className="px-5 py-3 text-[#806348]">{p.transaction_reference}</td>
                    <td className="px-5 py-3 text-[#806348]">{dateLabel(p.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
