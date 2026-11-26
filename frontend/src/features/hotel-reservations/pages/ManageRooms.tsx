import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, Sparkles } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { HotelSettings, Room } from '../../../types/models';
import { PageHeader, ErrorBox, Success, Loading, Badge, Modal } from '../../../components/ui/common';
import { money } from '../../../utils/format';
export function ManageRooms() {
  const query = useQuery<{ rooms: Room[] }>('/hotel/rooms'),
    settingsQuery = useQuery<{ settings: HotelSettings }>('/hotel/settings'),
    [editing, setEditing] = useState<Room | 'new' | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [housekeeping, setHousekeeping] = useState<Room | null>(null),
    [busy, setBusy] = useState(false);
  const room = editing && editing !== 'new' ? editing : null;
  async function saveHousekeeping(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!housekeeping) return;
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      await api(`/hotel/rooms/${housekeeping.id}/housekeeping`, send('PATCH', form));
      setHousekeeping(null);
      setMessage('Room condition updated.');
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      await api('/hotel/settings', send('PUT', {
        ...form,
        cancellation_notice_hours: Number(form.cancellation_notice_hours),
        no_show_grace_minutes: Number(form.no_show_grace_minutes),
        tax_rate: Number(form.tax_rate),
        service_fee_rate: Number(form.service_fee_rate),
      }));
      setMessage('Hotel policies and billing rates saved.');
      settingsQuery.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      data: Record<string, unknown> = Object.fromEntries(form);
    for (const k of ['capacity', 'bed_count', 'price_per_night']) data[k] = Number(data[k]);
    data.has_wifi = form.has('has_wifi');
    data.breakfast_included = form.has('breakfast_included');
    data.images = String(data.images ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setBusy(true);
    setError('');
    try {
      await api(`/hotel/rooms${room ? `/${room.id}` : ''}`, send(room ? 'PATCH' : 'POST', data));
      setEditing(null);
      setMessage('Room saved.');
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Room inventory"
        action={
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-2.5 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28]"
            onClick={() => {
              setEditing('new');
              setError('');
            }}
          >
            <Plus size={17} />
            Add room
          </button>
        }
      />
      <ErrorBox message={query.error} />
      <Success message={message} />
      {settingsQuery.data && (
        <section className="mb-6 rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] p-6 shadow-[0_10px_28px_rgba(84,34,14,.06)]">
          <div className="mb-5 border-b border-[#eadfce] pb-4">
            <p className="mb-1 text-sm font-medium text-[#98785b]">Front desk rules</p>
            <h2 className="m-0 !font-sans text-xl !font-semibold text-[#54220e]">Hotel policies and room billing</h2>
            <p className="mb-0 mt-1.5 max-w-[650px] text-sm leading-relaxed text-[#806348]">These rates apply to new room reservations and are recalculated when a stay is rescheduled.</p>
          </div>
          <form className="grid grid-cols-3 gap-[18px] max-[700px]:grid-cols-2 max-[500px]:grid-cols-1 [&_input]:!rounded-[10px] [&_input]:!border-[#ddcbb5] [&_input]:!bg-[#fffdf9]" onSubmit={saveSettings}>
            <label>Check-in time<input name="check_in_time" type="time" required defaultValue={settingsQuery.data.settings.check_in_time.slice(0, 5)} /></label>
            <label>Check-out time<input name="check_out_time" type="time" required defaultValue={settingsQuery.data.settings.check_out_time.slice(0, 5)} /></label>
            <label>Cancellation notice (hours)<input name="cancellation_notice_hours" type="number" min={0} max={168} required defaultValue={settingsQuery.data.settings.cancellation_notice_hours} /></label>
            <label>No-show grace (minutes)<input name="no_show_grace_minutes" type="number" min={0} max={1440} required defaultValue={settingsQuery.data.settings.no_show_grace_minutes} /></label>
            <label>Room tax (%)<input name="tax_rate" type="number" min={0} max={100} step="0.01" required defaultValue={settingsQuery.data.settings.tax_rate} /></label>
            <label>Hotel service charge (%)<input name="service_fee_rate" type="number" min={0} max={100} step="0.01" required defaultValue={settingsQuery.data.settings.service_fee_rate} /></label>
            <div className="col-span-full max-[500px]:col-span-auto"><button className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}>{busy ? 'Saving…' : 'Save policies and rates'}</button></div>
          </form>
        </section>
      )}
      <div className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_10px_28px_rgba(84,34,14,.06)]">
        {query.loading ? (
          <Loading />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse bg-[#fffaf2] text-left text-xs">
              <thead>
                <tr>
                  {['Room', 'Type', 'Capacity', 'Rate / night', 'Room status', 'Housekeeping', 'Action'].map((heading) => <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]" key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {query.data?.rooms.map((r) => (
                  <tr className="border-b border-[#eadfce] last:border-b-0" key={r.id}>
                    <td className="align-top px-5 py-4">
                      <span className="inline-grid h-9 min-w-11 place-items-center rounded-lg bg-[#ead5b8] px-2 text-xs font-bold text-[#54220e]">{r.room_number}</span>
                    </td>
                    <td className="align-top px-5 py-4 text-[#54220e]">
                      <strong className="font-semibold">{r.room_type}</strong>
                      <small className="mt-1 block text-xs text-[#806348]">
                        {r.bed_count} {r.bed_type}
                      </small>
                    </td>
                    <td className="align-top px-5 py-4 text-[#70462c]">{r.capacity} guests</td>
                    <td className="align-top px-5 py-4 font-semibold text-[#54220e]">{money(r.price_per_night)}</td>
                    <td className="align-top px-5 py-4">
                      <Badge status={r.status} />
                    </td>
                    <td className="align-top px-5 py-4">
                      <Badge status={r.housekeeping_status} />
                      {r.housekeeping_notes && <small className="mt-1 block max-w-[170px] text-xs leading-relaxed text-[#806348]">{r.housekeeping_notes}</small>}
                    </td>
                    <td className="align-top px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#d8bfa0] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#642c14] transition-colors hover:border-[#9b6a43] hover:bg-[#f7ecdc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28]"
                          onClick={() => { setEditing(r); setError(''); }}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#d8bfa0] bg-[#f3e1c7] px-3 py-2 text-xs font-semibold text-[#642c14] transition-colors hover:border-[#9b6a43] hover:bg-[#ead5b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28]"
                          onClick={() => { setHousekeeping(r); setError(''); }}
                        >
                          <Sparkles size={14} />
                          Room condition
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <Modal
          className="max-w-[760px]"
          title={room ? `Edit room ${room.room_number}` : 'Add a room'}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <ErrorBox message={error} />
          <form className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1 [&_input:not([type=checkbox])]:!rounded-[10px] [&_input:not([type=checkbox])]:!border-[#ddcbb5] [&_input:not([type=checkbox])]:!bg-[#fffdf9] [&_select]:!rounded-[10px] [&_select]:!border-[#ddcbb5] [&_select]:!bg-[#fffdf9] [&_textarea]:!rounded-[10px] [&_textarea]:!border-[#ddcbb5] [&_textarea]:!bg-[#fffdf9]" onSubmit={save}>
            <label>
              Room number
              <input name="room_number" defaultValue={room?.room_number} required maxLength={20} />
            </label>
            <label>
              Room type
              <input
                name="room_type"
                defaultValue={room?.room_type}
                required
                maxLength={80}
                placeholder="Deluxe King"
              />
            </label>
            <label>
              Nightly rate (PHP)
              <input
                name="price_per_night"
                type="number"
                min="0.01"
                max={1000000}
                step="0.01"
                defaultValue={room?.price_per_night}
                required
              />
            </label>
            <label>
              Guest capacity
              <input
                name="capacity"
                type="number"
                min={1}
                max={20}
                defaultValue={room?.capacity ?? 2}
                required
              />
            </label>
            <label>
              Bed type
              <input name="bed_type" defaultValue={room?.bed_type ?? 'Queen'} required maxLength={80} />
            </label>
            <label>
              Number of beds
              <input
                name="bed_count"
                type="number"
                min={1}
                max={10}
                defaultValue={room?.bed_count ?? 1}
                required
              />
            </label>
            <label className="col-span-full max-[500px]:col-span-auto">
              Status
              <select name="status" defaultValue={room?.status ?? 'available'}>
                <option value="available">Available for booking</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="col-span-full max-[500px]:col-span-auto">
              Description
              <textarea name="description" defaultValue={room?.description ?? ''} maxLength={2000} />
            </label>
            <label className="col-span-full max-[500px]:col-span-auto">
              Amenities
              <input
                name="special_amenities"
                defaultValue={room?.special_amenities ?? ''}
                maxLength={1000}
                placeholder="Balcony, coffee maker"
              />
            </label>
            <label className="flex flex-row items-center gap-[9px]">
              <input name="has_wifi" type="checkbox" defaultChecked={room?.has_wifi ?? true} />
              Wi-Fi included
            </label>
            <label className="flex flex-row items-center gap-[9px]">
              <input
                name="breakfast_included"
                type="checkbox"
                defaultChecked={room?.breakfast_included ?? false}
              />
              Breakfast included
            </label>
            <label className="col-span-full max-[500px]:col-span-auto">
              Cover image URL <span className="text-[#806348]">(optional)</span>
              <input
                name="image_url"
                type="url"
                defaultValue={room?.image_url ?? ''}
                placeholder="https://…"
              />
            </label>
            <label className="col-span-full max-[500px]:col-span-auto">
              Gallery image URLs <span className="text-[#806348]">(one per line, up to 8)</span>
              <textarea
                name="images"
                defaultValue={room?.images.map((i) => i.image_url).join('\n') ?? ''}
                rows={3}
              />
            </label>
            <div className="col-span-full max-[500px]:col-span-auto">
              <button className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}>{busy ? 'Saving…' : 'Save room'}</button>
            </div>
          </form>
        </Modal>
      )}
      {housekeeping && (
        <Modal title={`Room condition · ${housekeeping.room_number}`} onClose={() => { if (!busy) setHousekeeping(null); }}>
          <ErrorBox message={error} />
          <form className="flex flex-col gap-4 [&_select]:!rounded-[10px] [&_select]:!border-[#ddcbb5] [&_select]:!bg-[#fffdf9] [&_textarea]:!rounded-[10px] [&_textarea]:!border-[#ddcbb5] [&_textarea]:!bg-[#fffdf9]" onSubmit={saveHousekeeping}>
            <p className="mb-1 text-sm leading-relaxed text-[#70462c]">Mark the room’s turnover state so the front desk only assigns rooms that are ready.</p>
            <label>
              Housekeeping status
              <select name="housekeeping_status" defaultValue={housekeeping.housekeeping_status}>
                <option value="dirty">Dirty · needs turnover</option>
                <option value="cleaning">Cleaning in progress</option>
                <option value="clean">Clean · ready for inspection</option>
                <option value="inspected">Inspected · ready to assign</option>
                <option value="out_of_order">Out of order</option>
              </select>
            </label>
            <label>
              Housekeeping note
              <textarea name="housekeeping_notes" defaultValue={housekeeping.housekeeping_notes} maxLength={1000} rows={3} placeholder="Turnover notes, maintenance detail, or inspection note" />
            </label>
            <button className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}>{busy ? 'Saving…' : 'Save room condition'}</button>
          </form>
        </Modal>
      )}
    </>
  );
}
