import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, send } from '../../../services/client';
import { ErrorBox, PageHeader, Success } from '../../../components/ui/common';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setResetLink('');
    try {
      const result = await api<{ message: string; reset_link?: string }>(
        '/auth/forgot-password',
        send('POST', { email }),
      );
      setMessage(result.message);
      setResetLink(result.reset_link ?? '');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <PageHeader title="Forgot password" />
      <div className="panel">
        <ErrorBox message={error} />
        <Success message={message} />
        {resetLink && (
          <p>
            <a href={resetLink}>Open local reset link</a>
          </p>
        )}
        <form className="stack" onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button disabled={busy}>{busy ? 'Preparing link…' : 'Get reset link'}</button>
        </form>
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/auth/reset-password', send('POST', { token, password }));
      setDone(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <PageHeader title="Reset password" />
      <div className="panel">
        <ErrorBox message={error || (!token ? 'Reset link is missing.' : '')} />
        {done ? (
          <>
            <Success message="Password updated. You can log in now." />
            <Link to="/login">Login</Link>
          </>
        ) : (
          <form className="stack" onSubmit={submit}>
            <label>
              New password
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <button disabled={busy || !token}>{busy ? 'Updating…' : 'Reset password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
