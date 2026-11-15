import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { User } from '../../../types/models';
import { ErrorBox, PageHeader } from '../../../components/ui/common';
export function AuthPage({ register = false }: { register?: boolean }) {
  const { setUser } = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [remember, setRemember] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api<{ user: User }>(
        `/auth/${register ? 'register' : 'login'}`,
        send('POST', { ...fields, email, password, ...(!register ? { remember_me: remember } : {}) }),
      );
      setUser(result.user);
      navigate(location.state?.from ?? (result.user.role === 'customer' ? '/rooms' : '/overview'), {
        replace: true,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <PageHeader title={register ? 'Create account' : 'Login'} />
      <div className="panel">
        <ErrorBox message={error} />
        <form onSubmit={submit} className="stack">
          {register && (
            <div className="form-grid">
              <label>
                First name
                <input name="first_name" required maxLength={80} autoComplete="given-name" />
              </label>
              <label>
                Last name
                <input name="last_name" required maxLength={80} autoComplete="family-name" />
              </label>
              <label className="full">
                Phone number
                <input
                  name="phone_number"
                  type="tel"
                  required
                  defaultValue="+63 "
                  placeholder="+63 917 123 4567"
                  pattern="\+63[0-9 ]{9,14}"
                  title="Use a Philippine number beginning with +63"
                  minLength={12}
                  maxLength={18}
                  autoComplete="tel"
                />
              </label>
            </div>
          )}
          <label>
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={register ? 'new-password' : 'current-password'}
            />
          </label>
          {!register && (
            <div className="split auth-options">
              <label className="checkbox">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />{' '}
                Remember me
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          )}
          <button disabled={busy}>
            {busy ? (register ? 'Creating account…' : 'Logging in…') : register ? 'Create account' : 'Login'}
          </button>
        </form>
        <p className="muted">
          <Link to={register ? '/login' : '/register'}>{register ? 'Login' : 'Create account'}</Link>
        </p>
      </div>
      {!register && (
        <div className="demo-box">
          <strong>Demo accounts</strong>
          <p>
            Password: <code>Prototype123!</code>
          </p>
          <div className="actions">
            {['guest', 'staff', 'admin'].map((role) => (
              <button
                className="secondary small"
                key={role}
                onClick={() => {
                  setEmail(`${role}@example.com`);
                  setPassword('Prototype123!');
                }}
              >
                {role === 'guest' ? 'Guest' : role === 'staff' ? 'Staff' : 'Admin'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
