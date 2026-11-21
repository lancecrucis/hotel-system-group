import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Check, Clock } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { Detail, DiningTable, HotelSettings, Invoice, Room } from '../../../types/models';
import { PageHeader, Badge, ErrorBox, Success, Loading, Modal } from '../../../components/ui/common';
import { money, dateLabel, timestamp, label } from '../../../utils/format';
const actionLabels: Record<string, string> = {
  confirmed: 'Confirm booking',
  checked_in: 'Check in',
  checked_out: 'Check out',
  arrived: 'Mark arrived',
  seated: 'Seat guests',
  completed: 'Complete visit',
  no_show: 'Mark no-show',
  cancelled: 'Cancel reservation',
};
const actionDescriptions: Record<string, string> = {
  confirmed: 'Approve this booking for the guest.',
  checked_in: 'Record the guest arrival and occupy the room.',
  checked_out: 'Close the stay after the balance is settled.',
  arrived: 'Record that the dining party has arrived.',
  seated: 'Record that the party has been seated.',
  completed: 'Close the dining visit.',
  no_show: 'Record that the guest did not arrive.',
  cancelled: 'Cancel the reservation and capture a reason.',
};
function timeLabel(value: string) {
  const [hourText, minute] = value.slice(0, 5).split(':');
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}
type ProgressStage = {
  key: string;
  name: string;
  event?: { changed_at: string };
  done: boolean;
  detail?: string;
};
export function ReservationDetail() {
  const { id } = useParams(),
    query = useQuery<Detail>(`/reservations/${id}`, 15000),
    invoiceQuery = useQuery<{ invoice: Invoice | null }>(`/reservations/${id}/invoice`, 30000),
    hotelSettingsQuery = useQuery<{ settings: HotelSettings }>('/hotel/settings', 30000),
    roomOptions = useQuery<{ rooms: Room[] }>('/hotel/rooms?include_unavailable=true&guests=1', 30000),
    tableOptions = useQuery<{ tables: DiningTable[] }>('/restaurant/tables', 30000),
    { user } = useAuth(),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState<string | null>(null),
    [rescheduling, setRescheduling] = useState(false),
    [editing, setEditing] = useState(false),
    [financial, setFinancial] = useState<'payment' | 'refund' | null>(null);
  async function mutate(path: string, method: string, data: unknown, message: string) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(path, send(method, data));
      setAction(null);
      setFinancial(null);
      setSuccess(message);
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!query.data)
    return (
      <>
        <ErrorBox message={query.error} />
        {query.loading && <Loading />}
        <Link to="/reservations">Back to reservations</Link>
      </>
    );
  const { reservation: r, history, payments, refunds, allowed_actions } = query.data,
    staff = user!.role !== 'customer';
  const grossPaid = Number(r.paid_amount),
    refunded = Number(r.refunded_amount),
    paid = grossPaid - refunded,
    balance = Math.max(0, Number(r.total_amount) - paid);
  const refundable = payments.filter(
    (p) =>
      Number(p.amount) -
        refunds.filter((f) => f.payment_id === p.id).reduce((n, f) => n + Number(f.refund_amount), 0) >
      0,
  );
  const stopped = ['cancelled', 'expired', 'no_show'].includes(r.status);
  const canReschedule = staff && ['pending', 'confirmed'].includes(r.status);
  const canEdit = staff && !['cancelled', 'expired', 'no_show', 'checked_out', 'completed'].includes(r.status);
  const latestPayment = payments.at(-1),
    latestRefund = refunds.at(-1);
  const stages: ProgressStage[] = r.reservation_type === 'hotel'
    ? [
        { key: 'pending', name: 'Booking submitted', event: history.find((h) => h.new_status === 'pending'), done: history.some((h) => h.new_status === 'pending') },
        { key: 'payment', name: 'Payment confirmed', event: latestPayment ? { changed_at: latestPayment.paid_at } : undefined, done: grossPaid > 0 && grossPaid >= Number(r.total_amount) },
        { key: 'confirmed', name: 'Reservation confirmed', event: history.find((h) => h.new_status === 'confirmed'), done: ['confirmed', 'checked_in', 'checked_out'].includes(r.status) },
        { key: 'checked_in', name: 'Checked in', event: history.find((h) => h.new_status === 'checked_in'), done: ['checked_in', 'checked_out'].includes(r.status) },
        { key: 'checked_out', name: 'Checked out', event: history.find((h) => h.new_status === 'checked_out'), done: r.status === 'checked_out' },
        { key: 'completed', name: 'Completed', event: history.find((h) => h.new_status === 'checked_out'), done: r.status === 'checked_out' },
      ]
    : [
        { key: 'pending', name: 'Booking submitted', event: history.find((h) => h.new_status === 'pending'), done: history.some((h) => h.new_status === 'pending') },
        { key: 'confirmed', name: 'Reservation confirmed', event: history.find((h) => h.new_status === 'confirmed'), done: ['confirmed', 'arrived', 'seated', 'completed'].includes(r.status) },
        { key: 'arrived', name: 'Arrived', event: history.find((h) => h.new_status === 'arrived'), done: ['arrived', 'seated', 'completed'].includes(r.status) },
        { key: 'seated', name: 'Seated', event: history.find((h) => h.new_status === 'seated'), done: ['seated', 'completed'].includes(r.status) },
        { key: 'completed', name: 'Visit completed', event: history.find((h) => h.new_status === 'completed'), done: r.status === 'completed' },
      ];
  if (refunded > 0)
    stages.push({
      key: 'refund',
      name: refunded >= grossPaid ? 'Refunded' : 'Partially refunded',
      event: latestRefund ? { changed_at: latestRefund.processed_at } : undefined,
      done: true,
      detail: `${money(refunded)} returned`,
    });
  function financialSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const payload =
      financial === 'payment'
        ? { ...data, amount: Number(data.amount) }
        : { ...data, refund_amount: Number(data.refund_amount) };
    void mutate(
      `/reservations/${id}/${financial === 'payment' ? 'payments' : 'refunds'}`,
      'POST',
      payload,
      financial === 'payment' ? 'Payment recorded.' : 'Refund recorded.',
    );
  }
  async function rescheduleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(`/reservations/${id}/schedule`, send('PATCH', data));
      setRescheduling(false);
      setSuccess('Reservation rescheduled.');
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function editSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(`/reservations/${id}/edit`, send('PATCH', {
        ...data,
        guest_count: Number(data.guest_count),
        ...(data.table_id ? { table_id: data.table_id } : {}),
      }));
      setEditing(false);
      setSuccess('Reservation details updated.');
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="mb-4 inline-flex items-center gap-1.5 font-serif text-sm text-[#8f421d]" to="/reservations">
        <ArrowLeft size={16} />
        {staff ? 'Back to reservations' : 'Back to my reservations'}
      </Link>
      <PageHeader
        title={r.reservation_reference}
        action={
          <button className="print:hidden border border-[#a87652] bg-[#fff8ee] px-4 py-2 font-serif text-xs font-bold text-[#642c14] hover:bg-[#f1dfc8]" onClick={() => window.print()}>
            <Printer size={17} />
            Print details
          </button>
        }
      />
      <ErrorBox message={query.error || error} />
      <Success message={success} />
      {r.status === 'pending' && (
        <div className="mb-5 flex items-start gap-2.5 border border-dashed border-[#a87652] bg-[#f7e8d2] px-[15px] py-[13px] text-[13px] text-[#54220e]">
          <Clock size={20} />
          <div>
            <strong>Confirm by {timestamp(r.hold_expires_at!)}</strong>
          </div>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(290px,.75fr)] items-start gap-[18px] max-[1200px]:grid-cols-1">
        <div className="flex flex-col gap-3">
          <section className="border border-[#c8a783] bg-[#fff8ee] p-[26px]">
            <div className="flex items-center justify-between gap-4">
              <h2>Reservation details</h2>
              <Badge status={r.status} />
            </div>
            <dl className="space-y-0 [&>div]:grid [&>div]:grid-cols-[.8fr_1.2fr] [&>div]:gap-3 [&>div]:border-b [&>div]:border-[#d8bfa0] [&>div]:py-3 [&>dt]:text-xs [&>dt]:text-[#806348] [&>dd]:m-0 [&>dd]:text-right [&>dd]:text-xs max-[500px]:[&>div]:grid-cols-[1fr_1.3fr]">
              {r.hotel ? (
                <>
                  <div>
                    <dt>Room</dt>
                    <dd>
                      {r.hotel.room_type} · {r.hotel.room_number}
                    </dd>
                  </div>
                  <div>
                    <dt>Check-in</dt>
                      <dd>{dateLabel(r.hotel.check_in)} · from {hotelSettingsQuery.data ? timeLabel(hotelSettingsQuery.data.settings.check_in_time) : '3:00 PM'}</dd>
                  </div>
                  <div>
                    <dt>Check-out</dt>
                    <dd>{dateLabel(r.hotel.check_out)} · by 11:00 AM</dd>
                  </div>
                  <div>
                    <dt>Nightly rate</dt>
                    <dd>{money(r.hotel.price_per_night)}</dd>
                  </div>
                  {r.hotel.checked_in_at && (
                    <div>
                      <dt>Actual check-in</dt>
                      <dd>{timestamp(r.hotel.checked_in_at)}</dd>
                    </div>
                  )}
                  {r.hotel.checked_out_at && (
                    <div>
                      <dt>Actual check-out</dt>
                      <dd>{timestamp(r.hotel.checked_out_at)}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt>Dining date</dt>
                    <dd>{dateLabel(r.restaurant!.reservation_date)}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>
                      {r.restaurant!.start_time.slice(0, 5)}–{r.restaurant!.end_time.slice(0, 5)}
                    </dd>
                  </div>
                  {r.restaurant!.table_name && (
                    <div>
                      <dt>Table</dt>
                      <dd>{r.restaurant!.table_name}</dd>
                    </div>
                  )}
                  {r.restaurant!.arrived_at && (
                    <div>
                      <dt>Arrived</dt>
                      <dd>{timestamp(r.restaurant!.arrived_at)}</dd>
                    </div>
                  )}
                  {r.restaurant!.seated_at && (
                    <div>
                      <dt>Seated</dt>
                      <dd>{timestamp(r.restaurant!.seated_at)}</dd>
                    </div>
                  )}
                  {r.restaurant!.completed_at && (
                    <div>
                      <dt>Visit completed</dt>
                      <dd>{timestamp(r.restaurant!.completed_at)}</dd>
                    </div>
                  )}
                </>
              )}
              <div>
                <dt>Guests</dt>
                <dd>{r.hotel?.guest_count ?? r.restaurant!.guest_count}</dd>
              </div>
              <div>
                <dt>Contact email</dt>
                <dd>{r.contact_email}</dd>
              </div>
              <div>
                <dt>Contact phone</dt>
                <dd>{r.contact_phone}</dd>
              </div>
              <div>
                <dt>Special requests</dt>
                <dd className="whitespace-pre-wrap break-words">
                  {r.hotel?.special_requests || r.restaurant?.special_requests || 'None'}
                </dd>
              </div>
              {r.cancellation_reason && (
                <div>
                  <dt>Cancellation reason</dt>
                  <dd>{r.cancellation_reason}</dd>
                </div>
              )}
            </dl>
          </section>
          <section className="border border-[#c8a783] bg-[#fff8ee] p-[26px]">
            <h2>Status timeline</h2>
            <ol className="relative ml-1 list-none space-y-5 border-l-2 border-[#ddd] pl-7">
              {history.map((h) => (
                <li key={h.id}>
              <span className="absolute -left-[15px] grid h-7 w-7 place-items-center rounded-full border-2 border-[#642c14] bg-[#642c14] text-white">
                    <Check size={12} />
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <strong>{label(h.new_status)}</strong>
                    <small>{timestamp(h.changed_at)}</small>
                  </div>
                  <p>{h.reason}</p>
                  <small>{h.changed_by_name ?? 'System'}</small>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="flex flex-col gap-3">
          <section className={`border border-[#c8a783] bg-[#fff8ee] p-5 ${stopped ? 'opacity-80' : ''}`} aria-label="Reservation progress">
            <div className="flex items-start justify-between gap-4"><div><h2 className="m-0 text-xl font-semibold">Reservation progress</h2></div><Badge status={r.status} /></div>
            <ol className="mt-[17px] list-none space-y-3 p-0">
              {stages.map((stage, index) => {
                const current = !stopped && !stage.done && !stages.slice(index + 1).some((later) => later.done);
                return <li key={stage.key} className="flex items-start gap-3" aria-current={current ? 'step' : undefined}>
                  <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold ${stage.done || current ? 'border-[#642c14] bg-[#642c14] text-white' : 'border-[#c8a783] bg-[#fff8ee] text-[#806348]'}`}>{stage.done ? <Check size={15} /> : index + 1}</span>
                  <div className="flex flex-col"><strong className={stage.done || current ? 'text-[#54220e]' : 'text-[#9b8064]'}>{stage.name}</strong>{stage.detail && <small className="font-semibold text-[#54220e]">{stage.detail}</small>}{stage.event && <small>{timestamp(stage.event.changed_at)}</small>}{current && !stage.event && <small>Up next</small>}</div>
                </li>;
              })}
            </ol>
            {stopped && <p className="mt-4 text-xs text-[#806348]">Reservation {label(r.status).toLowerCase()}.</p>}
          </section>
          <section className="border border-[#c8a783] bg-[#fff8ee] p-[26px]">
            <h2>{r.reservation_type === 'hotel' ? 'Payment summary' : 'Reservation fee'}</h2>
            <dl className="space-y-0 [&>div]:grid [&>div]:grid-cols-[.8fr_1.2fr] [&>div]:gap-3 [&>div]:border-b [&>div]:border-[#d8bfa0] [&>div]:py-3 [&>dt]:text-xs [&>dt]:text-[#806348] [&>dd]:m-0 [&>dd]:text-right [&>dd]:text-xs">
              {r.hotel && <>
                <div>
                  <dt>Room charges</dt>
                  <dd>{money(r.subtotal_amount)}</dd>
                </div>
                <div>
                  <dt>Tax</dt>
                  <dd>{money(r.tax_amount)}</dd>
                </div>
                <div>
                  <dt>Service fee</dt>
                  <dd>{money(r.service_fee_amount)}</dd>
                </div>
              </>}
              <div>
                <dt>Total</dt>
                <dd>{money(r.total_amount)}</dd>
              </div>
              <div>
                <dt>Payments recorded</dt>
                <dd>{money(r.paid_amount)}</dd>
              </div>
              <div>
                <dt>Refunds recorded</dt>
                <dd>{money(r.refunded_amount)}</dd>
              </div>
              <div className="border-b-0 pt-4 font-semibold">
                <dt>{['cancelled', 'no_show'].includes(r.status) ? 'Net retained' : 'Balance due'}</dt>
                <dd>{money(['cancelled', 'no_show'].includes(r.status) ? paid : balance)}</dd>
              </div>
            </dl>
            <p className="text-xs text-[#806348]">
              {r.reservation_type === 'hotel' ? 'Pay at the property.' : 'Meal billed at the restaurant.'}
            </p>
            {r.hotel && invoiceQuery.data?.invoice && (
              <div className="mt-4 border-t border-[#d8bfa0] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong className="block text-sm">Invoice {invoiceQuery.data.invoice.invoice_number}</strong>
                    <small className="text-xs text-[#806348]">Room charges, tax, and service fee</small>
                  </div>
                  <button className="border border-[#d8bfa0] bg-[#ead5b8] px-3 py-2 text-xs font-semibold text-[#54220e] hover:bg-[#d8bfa0]" onClick={() => window.print()}>Print invoice</button>
                </div>
              </div>
            )}
            {staff &&
              r.reservation_type === 'hotel' &&
              ['confirmed', 'checked_in'].includes(r.status) &&
              balance > 0 && (
                <button
                  className="print:hidden w-full border border-[#642c14] bg-[#642c14] px-4 py-2 text-xs font-semibold text-[#fff8ee] hover:bg-[#54220e]"
                  onClick={() => {
                    setError('');
                    setFinancial('payment');
                  }}
                >
                  Record payment
                </button>
              )}
            {staff &&
              refundable.length > 0 &&
              ['cancelled', 'checked_out', 'completed', 'no_show'].includes(r.status) && (
                <button
                  className="print:hidden w-full border border-[#c8a783] bg-[#ead5b8] px-4 py-2 text-xs font-semibold text-[#54220e] hover:bg-[#d8bfa0]"
                  onClick={() => {
                    setError('');
                    setFinancial('refund');
                  }}
                >
                  Record refund
                </button>
              )}
            {(payments.length > 0 || refunds.length > 0) && (
              <div className="mt-4 space-y-3 border-t border-[#d8bfa0] pt-4">
                {payments.map((p) => (
                  <div key={p.id}>
                    <strong>
                      {money(p.amount)} · {label(p.payment_method)}
                    </strong>
                    <small>
                      {p.transaction_reference} · {timestamp(p.paid_at)}
                    </small>
                    <Badge status={p.payment_status} />
                  </div>
                ))}
                {refunds.map((f) => (
                  <div key={f.id}>
                    <strong>Refund · {money(f.refund_amount)}</strong>
                    <small>{f.refund_reference}</small>
                    <p>{f.refund_reason}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
          {(allowed_actions.length > 0 || canReschedule || canEdit) && (
          <section className="no-print rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] p-5 shadow-[0_10px_28px_rgba(84,34,14,.06)]">
              <div className="mb-4 border-b border-[#eadfce] pb-4">
                <p className="mb-1 text-sm font-medium text-[#98785b]">Front desk</p>
                <h2 className="m-0 !font-sans text-xl !font-semibold text-[#54220e]">Operations actions</h2>
                <p className="mb-0 mt-1.5 text-sm leading-relaxed text-[#806348]">Update the reservation as the guest moves through their stay or visit.</p>
              </div>
              <div className="grid gap-2.5">
                {canEdit && (
                  <button
                    className="flex min-h-12 items-center justify-start rounded-xl border border-[#b99673] bg-[#fffaf2] px-4 py-2.5 text-left text-[#54220e] transition-colors hover:border-[#8b4d28] hover:bg-[#f7ecdc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy}
                    onClick={() => { setError(''); setEditing(true); }}
                  >
                    <span>
                      <strong className="block text-sm font-semibold">Edit reservation details</strong>
                      <small className="mt-0.5 block text-xs text-[#806348]">Update guest information, party size, requests, or assignment.</small>
                    </span>
                  </button>
                )}
                {canReschedule && (
                  <button
                    className="flex min-h-12 items-center justify-start rounded-xl border border-[#b99673] bg-[#f3e1c7] px-4 py-2.5 text-left text-[#54220e] transition-colors hover:border-[#8b4d28] hover:bg-[#ead5b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy}
                    onClick={() => {
                      setError('');
                      setRescheduling(true);
                    }}
                  >
                    <span>
                      <strong className="block text-sm font-semibold">Reschedule reservation</strong>
                      <small className="mt-0.5 block text-xs text-[#70462c]">Change the stay dates or dining time.</small>
                    </span>
                  </button>
                )}
                {allowed_actions.map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    className={`flex min-h-12 items-center justify-start rounded-xl border px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] disabled:cursor-not-allowed disabled:opacity-50 ${s === 'cancelled' || s === 'no_show' ? 'border-[#b54724] bg-[#fff0e7] text-[#782c18] hover:bg-[#ffe4d7]' : 'border-[#642c14] bg-[#642c14] text-[#fff8ee] hover:bg-[#54220e]'}`}
                    onClick={() => {
                      setError('');
                      setAction(s);
                    }}
                  >
                    <span>
                      <strong className="block text-sm font-semibold">{actionLabels[s] ?? label(s)}</strong>
                      <small className={`mt-0.5 block text-xs ${s === 'cancelled' || s === 'no_show' ? 'text-[#9b4b32]' : 'text-[#f1dfc6]'}`}>{actionDescriptions[s] ?? 'Update this reservation status.'}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      {rescheduling && (
        <Modal
          title="Reschedule reservation"
          onClose={() => {
            if (!busy) setRescheduling(false);
          }}
        >
          <ErrorBox message={error} />
          <form className="flex flex-col gap-4" onSubmit={rescheduleSubmit}>
            <p className="mb-1 text-sm leading-relaxed text-[#70462c]">Choose a new time that is available. The guest will be notified after the change is saved.</p>
            {r.hotel ? (
              <div className="grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
                <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                  Check-in
                  <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="date" name="check_in" defaultValue={r.hotel.check_in} required />
                </label>
                <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                  Check-out
                  <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="date" name="check_out" defaultValue={r.hotel.check_out} required />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
                <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                  Dining date
                  <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="date" name="reservation_date" defaultValue={r.restaurant!.reservation_date} required />
                </label>
                <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
                  Start time
                  <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="time" name="start_time" defaultValue={r.restaurant!.start_time.slice(0, 5)} required />
                </label>
              </div>
            )}
            <button className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}>
              {busy ? 'Saving new schedule…' : 'Save new schedule'}
            </button>
          </form>
        </Modal>
      )}
      {editing && (
        <Modal title="Edit reservation details" onClose={() => { if (!busy) setEditing(false); }}>
          <ErrorBox message={error} />
          <form className="flex flex-col gap-4 [&_input]:!rounded-[10px] [&_input]:!border-[#ddcbb5] [&_input]:!bg-[#fffdf9] [&_select]:!rounded-[10px] [&_select]:!border-[#ddcbb5] [&_select]:!bg-[#fffdf9] [&_textarea]:!rounded-[10px] [&_textarea]:!border-[#ddcbb5] [&_textarea]:!bg-[#fffdf9]" onSubmit={editSubmit}>
            <div className="grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
              <label>Guest name<input name="contact_name" defaultValue={r.contact_name} required maxLength={160} /></label>
              <label>Guest count<input name="guest_count" type="number" min={1} max={r.hotel?.guest_count ? Math.max(r.hotel.guest_count, 6) : 500} defaultValue={r.hotel?.guest_count ?? r.restaurant?.guest_count} required /></label>
              <label>Email<input name="contact_email" type="email" defaultValue={r.contact_email} required maxLength={254} /></label>
              <label>Phone<input name="contact_phone" defaultValue={r.contact_phone} required maxLength={18} /></label>
            </div>
            {r.hotel ? (
              <label>Assigned room
                <select name="room_id" defaultValue={roomOptions.data?.rooms.find((room) => room.room_number === r.hotel!.room_number)?.id}>
                  {roomOptions.data?.rooms.filter((room) => room.capacity >= (r.hotel?.guest_count ?? 1)).map((room) => <option key={room.id} value={room.id}>{room.room_number} · {room.room_type} · {label(room.housekeeping_status)}</option>)}
                </select>
              </label>
            ) : (
              <label>Assigned table
                <select name="table_id" defaultValue={tableOptions.data?.tables.find((table) => table.name === r.restaurant!.table_name)?.id ?? ''}>
                  <option value="">Choose automatically</option>
                  {tableOptions.data?.tables.filter((table) => table.active && table.capacity >= (r.restaurant?.guest_count ?? 1)).map((table) => <option key={table.id} value={table.id}>{table.name} · {table.capacity} seats</option>)}
                </select>
              </label>
            )}
            <label>Special requests<textarea name="special_requests" defaultValue={r.hotel?.special_requests ?? r.restaurant?.special_requests ?? ''} maxLength={2000} rows={3} /></label>
            <button className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}>{busy ? 'Saving changes…' : 'Save reservation changes'}</button>
          </form>
        </Modal>
      )}
      {action && (
        <Modal
          title={actionLabels[action] ?? label(action)}
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
          <ErrorBox message={error} />
          <form
            className="flex flex-col gap-[18px]"
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              void mutate(
                `/reservations/${id}/status`,
                'PATCH',
                { status: action, reason: data.reason || '' },
                'Reservation updated.',
              );
            }}
          >
            <p>
              {action === 'confirmed'
                ? 'Confirm this reservation?'
                : `Change status to ${label(action).toLowerCase()}?`}
            </p>
            <label>
              {action === 'cancelled' ? 'Cancellation reason' : 'Note (optional)'}
              <textarea name="reason" required={action === 'cancelled'} maxLength={1000} rows={3} />
            </label>
            <button disabled={busy}>{busy ? 'Updating…' : actionLabels[action]}</button>
          </form>
        </Modal>
      )}
      {financial && (
        <Modal
          title={financial === 'payment' ? 'Record a payment' : 'Record a refund'}
          onClose={() => {
            if (!busy) setFinancial(null);
          }}
        >
          <ErrorBox message={error} />
          <div className="mb-5 flex items-start gap-2.5 rounded-[7px] border border-dashed border-[#b8b8b8] bg-[#f5f5f5] px-[15px] py-[13px] text-[13px] text-[#424242]">
            Record money already collected or refunded outside this app. This action does not move money.
          </div>
          <form className="flex flex-col gap-[18px]" onSubmit={financialSubmit}>
            {financial === 'payment' ? (
              <>
                <label>
                  Amount (PHP)
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    max={balance}
                    step="0.01"
                    defaultValue={balance.toFixed(2)}
                    required
                  />
                </label>
                <label>
                  Method
                  <select name="payment_method">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="external_card">External card terminal</option>
                  </select>
                </label>
                <label>
                  Receipt / transaction reference
                  <input
                    name="transaction_reference"
                    required
                    minLength={3}
                    maxLength={100}
                    defaultValue={`CASH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Original payment
                  <select name="payment_id" required>
                    {refundable.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.transaction_reference} ·{' '}
                        {money(
                          Number(p.amount) -
                            refunds
                              .filter((f) => f.payment_id === p.id)
                              .reduce((n, f) => n + Number(f.refund_amount), 0),
                        )}{' '}
                        remaining
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Refund amount (PHP)
                  <input name="refund_amount" type="number" min="0.01" step="0.01" required />
                </label>
                <label>
                  Reason
                  <textarea name="refund_reason" required minLength={3} maxLength={1000} />
                </label>
              </>
            )}
            <button disabled={busy}>
              {busy ? 'Recording…' : financial === 'payment' ? 'Record payment' : 'Record refund'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
