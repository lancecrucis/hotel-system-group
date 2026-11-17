import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api, send } from '../../../services/client';
import { ErrorBox, PageHeader } from '../../../components/ui/common';

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
      if (result.reset_link) setResetLink(result.reset_link);
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
        {message && <p className="muted">{message}</p>}
        {resetLink && (
          <div className="notice success">
            <span>
              Dev link: <a href={resetLink}>Reset your password</a>
            </span>
          </div>
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
          <button disabled={busy}>
            {busy ? 'Sending link…' : 'Send reset link'}
          </button>
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
      const result = await api<{ message: string }>(
        '/auth/reset-password',
        send('POST', { token, password, confirm_password: confirm }),
      );
      setMessage(result.message);
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
        <ErrorBox message={error || (!token ? 'Reset link is missing or invalid.' : '')} />
        {done ? (
          <>
            {message && <p className="muted">{message}</p>}
            <Link className="button" to="/login">Log in</Link>
          </>
        ) : (
          <form className="stack" onSubmit={submit}>
            <label>
              New password
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendLink, setResendLink] = useState('');

  useState(() => {
    if (!token) {
      setError('Missing verification token.');
      return;
    }
    setBusy(true);
    api<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => setMessage(r.message))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  });

  async function resend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setResendMessage('');
    setResendLink('');
    setBusy(true);
    try {
      const result = await api<{ message: string; verify_link?: string }>(
        '/auth/resend-verification',
        send('POST', { email }),
      );
      setResendMessage(result.message);
      if (result.verify_link) setResendLink(result.verify_link);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <PageHeader title="Verify email" />
      <div className="panel">
        <ErrorBox message={error} />
        {busy && <p className="muted">Verifying…</p>}
        {message && (
          <div className="stack">
            <div className="notice success"><span>{message}</span></div>
            <Link className="button" to="/login">Log in</Link>
          </div>
        )}
        {resendMessage && <p className="muted">{resendMessage}</p>}
        {resendLink && (
          <div className="notice success">
            <span>
              Dev link: <a href={resendLink}>Verify now</a>
            </span>
          </div>
        )}
        {(error || (!token && !message)) && (
          <form className="stack" onSubmit={resend}>
            <p className="muted">Enter your email to receive a new verification link.</p>
            <label>
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button disabled={busy}>{busy ? 'Sending…' : 'Resend verification'}</button>
          </form>
        )}
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
