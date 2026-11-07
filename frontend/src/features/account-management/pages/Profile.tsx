import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { User } from '../../../types/models';
import { ErrorBox, Success, PageHeader } from '../../../components/ui/common';
import { day } from '../../../utils/format';
export function Profile() {
  const { user, setUser } = useAuth(),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ user: User }>(
        '/auth/profile',
        send('PATCH', { ...d, date_of_birth: d.date_of_birth || null }),
      );
      setUser(result.user);
      setMessage('Profile updated.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader title="Profile" />
      <div className="panel narrow">
        <ErrorBox message={error} />
        <Success message={message} />
        <form className="form-grid" onSubmit={submit}>
          <label>
            First name
            <input name="first_name" defaultValue={user!.first_name} required maxLength={80} />
          </label>
          <label>
            Last name
            <input name="last_name" defaultValue={user!.last_name} required maxLength={80} />
          </label>
          <label>
            Phone number
            <input
              name="phone_number"
              defaultValue={user!.phone_number}
              required
              minLength={7}
              maxLength={30}
            />
          </label>
          <label>
            Date of birth <span className="muted">(optional)</span>
            <input type="date" name="date_of_birth" defaultValue={user!.date_of_birth ?? ''} max={day()} />
          </label>
          <label className="full">
            Email
            <input value={user!.email} disabled />
          </label>
          <div className="full">
            <button disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
