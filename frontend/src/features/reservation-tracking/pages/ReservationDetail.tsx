import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Check, Clock } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { Detail } from '../../../types/models';
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
export function ReservationDetail() {
  const { id } = useParams(),
    query = useQuery<Detail>(`/reservations/${id}`, 15000),
    { user } = useAuth(),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState<string | null>(null),
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
  const paid = Number(r.paid_amount) - Number(r.refunded_amount),
    balance = Math.max(0, Number(r.total_amount) - paid);
  const refundable = payments.filter(
    (p) =>
      Number(p.amount) -
        refunds.filter((f) => f.payment_id === p.id).reduce((n, f) => n + Number(f.refund_amount), 0) >
      0,
  );
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
  return (
    <>
      <Link className="back-link" to="/reservations">
        <ArrowLeft size={16} />
        All reservations
      </Link>
      <PageHeader
        title={r.reservation_reference}
        action={
          <button className="secondary no-print" onClick={() => window.print()}>
            <Printer size={17} />
            Print details
          </button>
        }
      />
      <ErrorBox message={query.error || error} />
      <Success message={success} />
      {r.status === 'pending' && (
        <div className="notice warning">
          <Clock size={20} />
          <div>
            <strong>Confirm by {timestamp(r.hold_expires_at!)}</strong>
          </div>
        </div>
      )}
      <div className="detail-grid">
        <div className="stack">
          <section className="panel">
            <div className="split">
              <h2>Reservation details</h2>
              <Badge status={r.status} />
            </div>
            <dl className="details-list">
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
                    <dd>{dateLabel(r.hotel.check_in)} · from 3:00 PM</dd>
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
                <dd className="preserve">
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
          <section className="panel">
            <h2>Status timeline</h2>
            <ol className="timeline">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="timeline-dot">
                    <Check size={12} />
                  </span>
                  <div className="split">
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
        <div className="stack">
          <section className="panel">
            <h2>{r.reservation_type === 'hotel' ? 'Payment summary' : 'Reservation fee'}</h2>
            <dl className="details-list">
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
              <div className="total">
                <dt>{['cancelled', 'no_show'].includes(r.status) ? 'Net retained' : 'Balance due'}</dt>
                <dd>{money(['cancelled', 'no_show'].includes(r.status) ? paid : balance)}</dd>
              </div>
            </dl>
            <p className="muted small-text">
              {r.reservation_type === 'hotel' ? 'Pay at the property.' : 'Meal billed at the restaurant.'}
            </p>
            {staff &&
              r.reservation_type === 'hotel' &&
              ['confirmed', 'checked_in'].includes(r.status) &&
              balance > 0 && (
                <button
                  className="secondary full-width no-print"
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
                  className="secondary full-width no-print"
                  onClick={() => {
                    setError('');
                    setFinancial('refund');
                  }}
                >
                  Record refund
                </button>
              )}
            {(payments.length > 0 || refunds.length > 0) && (
              <div className="transaction-list">
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
          {allowed_actions.length > 0 && (
            <section className="panel no-print">
              <h2>Next actions</h2>
              <div className="stack">
                {allowed_actions.map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    className={s === 'cancelled' || s === 'no_show' ? 'secondary danger' : ''}
                    onClick={() => {
                      setError('');
                      setAction(s);
                    }}
                  >
                    {actionLabels[s] ?? label(s)}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      {action && (
        <Modal
          title={actionLabels[action] ?? label(action)}
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
          <ErrorBox message={error} />
          <form
            className="stack"
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
          <div className="notice warning">
            Record money already collected or refunded outside this app. This action does not move money.
          </div>
          <form className="stack" onSubmit={financialSubmit}>
            {financial === 'payment' ? (
              <>
                <label>
                  Amount (USD)
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
                  Refund amount (USD)
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
