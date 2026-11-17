import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { User } from '../../../types/models';
import { ErrorBox, Success, PageHeader } from '../../../components/ui/common';

function PasswordStrength({ password }: { password: string }) {
  const tests = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'One digit', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const passed = tests.filter((t) => t.pass).length;
  if (!password) return null;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="split" style={{ gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: n <= passed ? '#161616' : '#e0e0e0',
            }}
          />
        ))}
      </div>
      <small>{tests.filter((t) => !t.pass).map((t) => t.label).join(' · ') || 'Strong password'}</small>
    </div>
  );
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const { setUser } = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [remember, setRemember] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const fields = Object.fromEntries(new FormData(e.currentTarget));
      if (register && fields.password !== fields.confirm_password) {
        setError('Passwords do not match.');
        setBusy(false);
        return;
      }
      const result = await api<{ user: User; message?: string; verify_link?: string }>(
        `/auth/${register ? 'register' : 'login'}`,
        send('POST', {
          ...fields,
          email,
          ...(register ? { password, confirm_password: confirm } : { password, remember_me: remember }),
        }),
      );
      if (register && result.message) {
        setSuccess(result.message + (result.verify_link ? ' (Dev links shown below)' : ''));
        if (result.verify_link) setSuccess((s) => s + '\n' + result.verify_link);
      } else {
        setUser(result.user);
        navigate(location.state?.from ?? (result.user.role === 'customer' ? '/rooms' : '/overview'), {
          replace: true,
        });
      }
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
        {success && <Success message={success} />}
        {!success && (
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
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={register ? 'new-password' : 'current-password'}
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
            {register && (
              <>
                <PasswordStrength password={password} />
                <label>
                  Confirm password
                  <input
                    type="password"
                    name="confirm_password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
              </>
            )}
            {!register && (
              <div className="split auth-options">
                <label className="checkbox">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            <button type="submit" disabled={busy}>
              {busy ? (register ? 'Creating account…' : 'Logging in…') : register ? 'Create account' : 'Login'}
            </button>
          </form>
        )}
        <p className="muted">
          {success ? (
            <Link to="/login">Go to login</Link>
          ) : (
            <Link to={register ? '/login' : '/register'}>{register ? 'Login' : 'Create account'}</Link>
          )}
        </p>
      </div>
      {!register && !success && (
        <div className="demo-box">
          <strong>Demo accounts</strong>
          <p>
            Password: <code>Prototype123!</code>
          </p>
          <div className="actions">
            {(['guest', 'staff', 'admin'] as const).map((role) => (
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
};
