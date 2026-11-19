import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { Settings } from '../../../types/models';
import { PageHeader, ErrorBox, Success, Loading } from '../../../components/ui/common';
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
      setMessage('Restaurant settings saved.');
      onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-[720px] border border-[#c8a783] bg-[#fff8ee] p-[26px] max-[500px]:p-[19px]">
      <ErrorBox message={error} />
      <Success message={message} />
      <form className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1" onSubmit={save}>
        <label>
          Total seating capacity
          <input
            name="max_capacity"
            type="number"
            min={1}
            max={500}
            required
            defaultValue={settings.max_capacity}
          />
        </label>
        <label>
          Maximum guests per booking
          <input
            name="max_guest_per_booking"
            type="number"
            min={1}
            max={500}
            required
            defaultValue={settings.max_guest_per_booking}
          />
        </label>
        <label>
          Opening time
          <input type="time" name="opening_time" required defaultValue={settings.opening_time.slice(0, 5)} />
        </label>
        <label>
          Closing time
          <input type="time" name="closing_time" required defaultValue={settings.closing_time.slice(0, 5)} />
        </label>
        <p className="col-span-full text-[#70462c] max-[500px]:col-span-auto">1-hour visits · 30 minutes between bookings · Times every 30 minutes.</p>
        <div className="col-span-full max-[500px]:col-span-auto">
          <button disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </div>
  );
}
export function RestaurantSettings() {
  const query = useQuery<{ settings: Settings }>('/restaurant/settings');
  return (
    <>
      <PageHeader title="Restaurant settings" />
      <ErrorBox message={query.error} />
      {query.loading && !query.data ? (
        <Loading />
      ) : (
        query.data && <SettingsForm settings={query.data.settings} onSave={query.reload} />
      )}
    </>
  );
}
