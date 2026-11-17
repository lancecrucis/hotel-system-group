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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
              className={`h-1 flex-1 rounded-sm ${n <= passed ? 'bg-[#161616]' : 'bg-[#e0e0e0]'}`}
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
    <div className="max-w-[720px]">
      <PageHeader title={register ? 'Create account' : 'Login'} />
      <div className="rounded-[20px] border border-[#e8e8e8] bg-white p-[26px] max-[500px]:p-[22px]">
        <ErrorBox message={error} />
        {success && <Success message={success} />}
        {!success && (
          <form onSubmit={submit} className="flex flex-col gap-[18px]">
            {register && (
              <div className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1">
                <label>
                  First name
                  <input name="first_name" required maxLength={80} autoComplete="given-name" />
                </label>
                <label>
                  Last name
                  <input name="last_name" required maxLength={80} autoComplete="family-name" />
                </label>
                <label className="col-span-full max-[500px]:col-span-auto">
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
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  className="pr-11"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 min-h-9 -translate-y-1/2 border-0 bg-transparent p-2 text-[#6e6e6e] hover:text-[#1d1d1d]"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              <div className="flex flex-wrap items-center justify-between gap-4">
                <label className="flex flex-row items-center gap-[9px]">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            <button className="w-full" type="submit" disabled={busy}>
              {busy ? (register ? 'Creating account…' : 'Logging in…') : register ? 'Create account' : 'Login'}
            </button>
          </form>
        )}
        <p className="text-[#6e6e6e]">
          {success ? (
            <Link to="/login">Go to login</Link>
          ) : (
            <Link to={register ? '/login' : '/register'}>{register ? 'Login' : 'Create account'}</Link>
          )}
        </p>
      </div>
      {!register && !success && (
        <div className="mt-6 rounded-[20px] border border-[#e8e8e8] bg-white p-6">
          <strong>Demo accounts</strong>
          <p>
            Password: <code>Prototype123!</code>
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {(['guest', 'staff', 'admin'] as const).map((role) => (
              <button
                className="min-h-[34px] rounded-full border border-[#dedede] bg-white px-3 py-[7px] text-xs font-semibold text-[#1d1d1d] hover:bg-[#f5f5f5]"
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
