import { useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { DiningTable, Settings } from '../../../types/models';
import { PageHeader, ErrorBox, Success, Loading, Modal } from '../../../components/ui/common';
function SettingsForm({ settings, onSave }: { settings: Settings; onSave: () => void }) {
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(
        '/restaurant/settings',
        send('PUT', {
          ...form,
          max_capacity: Number(form.max_capacity),
          max_guest_per_booking: Number(form.max_guest_per_booking),
        }),
      );
      setMessage('Dining settings saved.');
      onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-[760px] rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] p-6 shadow-[0_10px_28px_rgba(84,34,14,.06)] max-[500px]:p-4">
      <div className="mb-6 border-b border-[#eadfce] pb-5">
        <p className="mb-1 text-sm font-medium text-[#98785b]">Dining operations</p>
        <h2 className="m-0 !font-sans text-xl !font-semibold text-[#54220e]">Service hours and capacity</h2>
        <p className="mb-0 mt-1.5 max-w-[560px] text-sm leading-relaxed text-[#806348]">Set the limits guests see when they reserve a table online or at the front desk.</p>
      </div>
      <ErrorBox message={error} />
      <Success message={message} />
      <form className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1" onSubmit={save}>
        <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
          Total seating capacity
          <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15"
            name="max_capacity"
            type="number"
            min={1}
            max={500}
            required
            defaultValue={settings.max_capacity}
          />
        </label>
        <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
          Maximum guests per booking
          <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15"
            name="max_guest_per_booking"
            type="number"
            min={1}
            max={500}
            required
            defaultValue={settings.max_guest_per_booking}
          />
        </label>
        <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
          Opening time
          <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="time" name="opening_time" required defaultValue={settings.opening_time.slice(0, 5)} />
        </label>
        <label className="gap-1.5 text-sm font-semibold text-[#70462c]">
          Closing time
          <input className="!rounded-[10px] !border-[#ddcbb5] !bg-[#fffdf9] text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15" type="time" name="closing_time" required defaultValue={settings.closing_time.slice(0, 5)} />
        </label>
        <p className="col-span-full rounded-xl bg-[#f3e1c7] p-3 text-xs leading-relaxed text-[#70462c] max-[500px]:col-span-auto">1-hour visits · 30 minutes between bookings · Times every 30 minutes.</p>
        <div className="col-span-full max-[500px]:col-span-auto">
          <button className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </div>
  );
}
function TablesPanel({ tables, onSave }: { tables: DiningTable[]; onSave: () => void }) {
  const [editing, setEditing] = useState<DiningTable | 'new' | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const table = editing && editing !== 'new' ? editing : null;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api(`/restaurant/tables${table ? `/${table.id}` : ''}`, send(table ? 'PATCH' : 'POST', {
        name: String(form.get('name') ?? ''),
        shape: String(form.get('shape') ?? 'square'),
        capacity: Number(form.get('capacity')),
        active: form.has('active'),
      }));
      setEditing(null);
      onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] p-6 shadow-[0_10px_28px_rgba(84,34,14,.06)]">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#eadfce] pb-4 max-[550px]:flex-col">
        <div><p className="mb-1 text-sm font-medium text-[#98785b]">Dining inventory</p><h2 className="m-0 !font-sans text-xl !font-semibold text-[#54220e]">Tables and seating</h2><p className="mb-0 mt-1.5 text-sm leading-relaxed text-[#806348]">Keep the table map current so availability and assignments reflect the real dining room.</p></div>
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-4 py-2 text-sm font-semibold text-[#fff8ee] hover:bg-[#54220e]" onClick={() => { setEditing('new'); setError(''); }}><Plus size={16} />Add table</button>
      </div>
      <div className="grid grid-cols-3 gap-3 max-[800px]:grid-cols-2 max-[500px]:grid-cols-1">
        {tables.map((item) => <article className={`rounded-xl border p-4 ${item.active ? 'border-[#e5d4bf] bg-[#fffdf9]' : 'border-[#d8bfa0] bg-[#f3e1c7] opacity-75'}`} key={item.id}>
          <div className="flex items-start justify-between gap-3"><div><strong className="block text-base text-[#54220e]">{item.name}</strong><span className="text-xs text-[#806348]">{item.capacity} seats · {item.shape}</span></div><button className="grid h-8 w-8 place-items-center rounded-lg border border-[#d8bfa0] bg-[#fffaf2] text-[#642c14] hover:bg-[#f3e7d7]" aria-label={`Edit ${item.name}`} onClick={() => { setEditing(item); setError(''); }}><Pencil size={14} /></button></div>
          <span className="mt-3 inline-flex rounded-full bg-[#f3e1c7] px-2.5 py-1 text-[11px] font-semibold text-[#70462c]">{item.active ? 'Active for booking' : 'Offline'}</span>
        </article>)}
      </div>
      {editing && <Modal title={table ? `Edit table ${table.name}` : 'Add a dining table'} onClose={() => { if (!busy) setEditing(null); }}>
        <ErrorBox message={error} />
        <form className="flex flex-col gap-4 [&_input]:!rounded-[10px] [&_input]:!border-[#ddcbb5] [&_input]:!bg-[#fffdf9] [&_select]:!rounded-[10px] [&_select]:!border-[#ddcbb5] [&_select]:!bg-[#fffdf9]" onSubmit={save}>
          <label>Table name<input name="name" defaultValue={table?.name} required maxLength={40} placeholder="T12" /></label>
          <div className="grid grid-cols-2 gap-3"><label>Shape<select name="shape" defaultValue={table?.shape ?? 'square'}><option value="round">Round</option><option value="square">Square</option><option value="rectangle">Rectangle</option></select></label><label>Seats<input name="capacity" type="number" min={1} max={10} defaultValue={table?.capacity ?? 2} required /></label></div>
          <label className="flex flex-row items-center gap-2"><input name="active" type="checkbox" defaultChecked={table?.active ?? true} />Active for new reservations</label>
          <button className="w-full rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-3 text-sm font-semibold text-[#fff8ee] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}>{busy ? 'Saving…' : 'Save table'}</button>
        </form>
      </Modal>}
    </section>
  );
}
export function RestaurantSettings() {
  const query = useQuery<{ settings: Settings }>('/restaurant/settings'),
    tables = useQuery<{ tables: DiningTable[] }>('/restaurant/tables');
  return (
    <>
      <PageHeader title="Dining operations" />
      <ErrorBox message={query.error || tables.error} />
      {query.loading && !query.data ? (
        <Loading />
      ) : (
        query.data && tables.data && <><SettingsForm settings={query.data.settings} onSave={query.reload} /><TablesPanel tables={tables.data.tables} onSave={tables.reload} /></>
      )}
    </>
  );
}
