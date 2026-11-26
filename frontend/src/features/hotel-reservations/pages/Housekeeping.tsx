import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { Room } from '../../../types/models';
import { PageHeader, Badge, ErrorBox, Success, Loading, Empty, Modal } from '../../../components/ui/common';
import { timestamp } from '../../../utils/format';

type HkFilter = 'needs_cleaning' | 'dirty' | 'cleaning' | 'clean' | 'inspected' | 'out_of_order' | 'all';

const filterOptions: { value: HkFilter; label: string }[] = [
  { value: 'needs_cleaning', label: 'Needs cleaning' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'clean', label: 'Clean' },
  { value: 'inspected', label: 'Inspected' },
  { value: 'out_of_order', label: 'Out of order' },
  { value: 'all', label: 'All rooms' },
];

const nextActions: Record<string, { status: string; label: string }[]> = {
  dirty: [
    { status: 'cleaning', label: 'Start cleaning' },
    { status: 'out_of_order', label: 'Mark out of order' },
  ],
  cleaning: [
    { status: 'clean', label: 'Mark clean' },
    { status: 'out_of_order', label: 'Mark out of order' },
  ],
  clean: [
    { status: 'inspected', label: 'Mark inspected' },
    { status: 'cleaning', label: 'Back to cleaning' },
  ],
  inspected: [
    { status: 'cleaning', label: 'Re-clean' },
    { status: 'out_of_order', label: 'Mark out of order' },
  ],
  out_of_order: [
    { status: 'cleaning', label: 'Start recovery' },
    { status: 'dirty', label: 'Mark dirty' },
  ],
};

const EMPTY_ROOMS: Room[] = [];

export function Housekeeping() {
  const roomsQuery = useQuery<{ rooms: Room[] }>('/hotel/rooms?include_unavailable=true&guests=1', 30000);
  const [filter, setFilter] = useState<HkFilter>('needs_cleaning');
  const [editing, setEditing] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const rooms = roomsQuery.data?.rooms ?? EMPTY_ROOMS;
  const counts = useMemo(() => {
    const c = { dirty: 0, cleaning: 0, clean: 0, inspected: 0, out_of_order: 0 };
    for (const r of rooms) {
      if (r.housekeeping_status in c) c[r.housekeeping_status as keyof typeof c] += 1;
    }
    return c;
  }, [rooms]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rooms;
    if (filter === 'needs_cleaning') return rooms.filter((r) => ['dirty', 'cleaning'].includes(r.housekeeping_status));
    return rooms.filter((r) => r.housekeeping_status === filter);
  }, [rooms, filter]);

  async function updateStatus(room: Room, status: string, notes?: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/hotel/rooms/${room.id}/housekeeping`, send('PATCH', {
        housekeeping_status: status,
        housekeeping_notes: notes ?? room.housekeeping_notes ?? '',
      }));
      setMessage(`Room ${room.room_number} updated to ${status.replace('_', ' ')}.`);
      setEditing(null);
      roomsQuery.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openModal(room: Room) {
    setEditing(room);
    setError('');
    setMessage('');
  }

  function submitNotes(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = Object.fromEntries(new FormData(e.currentTarget));
    void updateStatus(editing, String(form.housekeeping_status), String(form.housekeeping_notes ?? ''));
  }

  const summary = [
    { name: 'Needs cleaning', value: counts.dirty + counts.cleaning, filter: 'needs_cleaning' as HkFilter },
    { name: 'Dirty', value: counts.dirty, filter: 'dirty' as HkFilter },
    { name: 'Cleaning', value: counts.cleaning, filter: 'cleaning' as HkFilter },
    { name: 'Clean', value: counts.clean, filter: 'clean' as HkFilter },
    { name: 'Inspected', value: counts.inspected, filter: 'inspected' as HkFilter },
    { name: 'Out of order', value: counts.out_of_order, filter: 'out_of_order' as HkFilter },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Housekeeping"
        action={
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-2.5 text-sm font-semibold text-[#fff8ee] no-underline transition-colors hover:bg-[#54220e]" to="/manage/rooms">
            Room inventory <ArrowRight size={16} />
          </Link>
        }
      />
      <p className="-mt-4 max-w-[640px] text-sm leading-relaxed text-[#806348]">
        Track rooms after checkout. A room must be <strong>clean</strong> or <strong>inspected</strong> before the next guest can check in.
      </p>
      <ErrorBox message={roomsQuery.error || error} />
      <Success message={message} />

      <section aria-label="Housekeeping counts" className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
        {summary.map((card) => (
          <button
            key={card.name}
            type="button"
            onClick={() => setFilter(card.filter)}
            className={`min-h-[110px] rounded-2xl border p-5 text-left shadow-[0_8px_24px_rgba(84,34,14,.055)] transition-colors ${filter === card.filter ? 'border-[#642c14] bg-[#f3e1c7]' : 'border-[#e5d4bf] bg-[#fffaf2] hover:border-[#c8a783]'}`}
          >
            <span className="block text-xs font-semibold leading-snug text-[#70462c]">{card.name}</span>
            <strong className="mt-3 block font-['Gelasio'] text-[30px] font-normal tracking-[-.4px] text-[#441901]">{card.value}</strong>
          </button>
        ))}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-sm font-medium text-[#98785b]">Work queue</p>
            <h2 className="m-0 !font-sans text-xl !font-semibold tracking-[-.025em] text-[#54220e]">
              {filterOptions.find((o) => o.value === filter)?.label}
            </h2>
          </div>
          <label className="text-xs font-semibold text-[#70462c]">
            Filter
            <select
              className="mt-1 min-h-10 rounded-xl border border-[#ddcbb5] bg-[#fffdf9] px-3 py-2 text-sm text-[#54220e]"
              value={filter}
              onChange={(e) => setFilter(e.target.value as HkFilter)}
            >
              {filterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        {roomsQuery.loading && !roomsQuery.data ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty title="No rooms in this list">
            <p className="mx-auto mt-2 max-w-[420px] text-sm text-[#806348]">
              {filter === 'needs_cleaning'
                ? 'All rooms are clean or inspected. Nice work.'
                : 'Try another filter.'}
            </p>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((room) => (
              <article key={room.id} className="rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] p-5 shadow-[0_8px_24px_rgba(84,34,14,.055)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-grid h-9 min-w-11 place-items-center rounded-lg bg-[#ead5b8] px-2 text-xs font-bold text-[#54220e]">
                      {room.room_number}
                    </span>
                    <h3 className="mb-0 mt-2 !font-sans text-sm !font-semibold text-[#54220e]">{room.room_type}</h3>
                    <p className="mb-0 mt-1 text-xs text-[#806348]">
                      {room.capacity} guests · {room.bed_count} {room.bed_type}
                    </p>
                  </div>
                  <Badge status={room.housekeeping_status} />
                </div>
                {room.housekeeping_notes && (
                  <p className="mt-3 rounded-lg bg-[#f3e1c7] p-2.5 text-xs leading-relaxed text-[#70462c]">
                    {room.housekeeping_notes}
                  </p>
                )}
                {room.housekeeping_updated_at && (
                  <p className="mt-2 text-[11px] text-[#98785b]">
                    Updated {timestamp(room.housekeeping_updated_at)}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(nextActions[room.housekeeping_status] ?? []).map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(room, action.status)}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#642c14] bg-[#642c14] px-3 py-2 text-xs font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {action.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => openModal(room)}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#d8bfa0] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#642c14] transition-colors hover:border-[#9b6a43] hover:bg-[#f7ecdc]"
                  >
                    Update status…
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <Modal title={`Room condition · ${editing.room_number}`} onClose={() => { if (!busy) setEditing(null); }}>
          <ErrorBox message={error} />
          <form className="flex flex-col gap-4 [&_select]:!rounded-[10px] [&_select]:!border-[#ddcbb5] [&_select]:!bg-[#fffdf9] [&_textarea]:!rounded-[10px] [&_textarea]:!border-[#ddcbb5] [&_textarea]:!bg-[#fffdf9]" onSubmit={submitNotes}>
            <label>
              Housekeeping status
              <select name="housekeeping_status" defaultValue={editing.housekeeping_status}>
                <option value="dirty">Dirty (needs cleaning)</option>
                <option value="cleaning">Cleaning in progress</option>
                <option value="clean">Clean</option>
                <option value="inspected">Inspected (ready)</option>
                <option value="out_of_order">Out of order</option>
              </select>
            </label>
            <label>
              Housekeeping note
              <textarea
                name="housekeeping_notes"
                defaultValue={editing.housekeeping_notes}
                maxLength={1000}
                rows={3}
                placeholder="Turnover notes, maintenance detail, or inspection note"
              />
            </label>
            <button
              className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save room condition'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
