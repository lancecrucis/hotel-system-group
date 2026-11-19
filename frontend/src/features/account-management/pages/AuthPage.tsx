import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { User } from '../../../types/models';
import { ErrorBox, Success } from '../../../components/ui/common';

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
    [remember, setRemember] = useState(true);

  function updateEmail(value: string) {
    setEmail(value);
    if (error) setError('');
  }

  function updatePassword(value: string) {
    setPassword(value);
    if (error) setError('');
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const fields = Object.fromEntries(new FormData(e.currentTarget));
      const submittedEmail = String(fields.email ?? email);
      const submittedPassword = String(fields.password ?? password);
      const submittedConfirm = String(fields.confirm_password ?? confirm);
      if (register && submittedPassword !== submittedConfirm) {
        setError('Passwords do not match.');
        setBusy(false);
        return;
      }
      const result = await api<{ user: User; message?: string; verify_link?: string }>(
        `/auth/${register ? 'register' : 'login'}`,
        send('POST', {
          ...fields,
          email: submittedEmail,
          ...(register ? { password: submittedPassword, confirm_password: submittedConfirm } : { password: submittedPassword, remember_me: remember }),
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
    <div className="relative z-[1] w-[min(100%,495px)]">
      <>
        <div className="mb-[40px] text-center">

          <img className="mx-auto block w-[84px]" 
          src="/images/login%20elements/logo%20girl%20image.png" 
          alt="" />

          <img className="mx-auto block w-[min(100%,400px)]" 
          src="/images/login%20elements/logo%20title%20page.png" 
          alt="La Illustrada Hotel" />

          <div className=" flex items-center justify-center gap-[13px] font-serif text-[27px]">
            <i className="block h-px w-[75px] bg-[#805c43]" />HOTEL
            <i className="block h-px w-[75px] bg-[#805c43]" />
          </div>

          <h1 className="mb-1 mt-[5px] font-['Gelasio'] text-[46px] font-normal leading-tight text-[#441901] max-[600px]:text-[38px]">{register ? 'Create Account' : 'Welcome Back'}</h1>

          <p className="mb-3 font-sans text-[20px] text-[#7d746b]">{register ? 'Create an account to begin your stay and dining experience' : 'Sign in to continue your stay and dining experience'}</p>
        </div>
      </>
      <div>
        <ErrorBox message={error} />
        {success && <Success message={success} />}
        {!success && (
          <form onSubmit={submit} className="flex flex-col gap-[18px]">
            {register && (
              <div className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1">
                <label className="gap-[7px] font-serif text-[21px] font-normal text-[#54220e]">
                  First name
                  <input className="!min-h-[52px] !rounded-none !border !border-[#a87652] !bg-[#f5e4cd] !font-sans !font-normal !text-[#54220e]" name="first_name" required maxLength={80} autoComplete="given-name" />
                </label>
                <label className="gap-[7px] font-serif text-[21px] font-normal text-[#54220e]">
                  Last name
                  <input className="!min-h-[52px] !rounded-none !border !border-[#a87652] !bg-[#f5e4cd] !font-sans !font-normal !text-[#54220e]" name="last_name" required maxLength={80} autoComplete="family-name" />
                </label>
                <label className="col-span-full gap-[7px] font-serif text-[21px] font-normal text-[#54220e] max-[500px]:col-span-auto">
                  Phone number
                  <input
                    className="!min-h-[52px] !rounded-none !border !border-[#a87652] !bg-[#f5e4cd] !font-sans !font-normal !text-[#54220e]"
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
            <label className="gap-[7px] font-serif text-[21px] font-normal text-[#54220e]">
              Email address
              <div className="flex h-[52px] min-w-0 items-center overflow-hidden border border-[#a87652] bg-[#f5e4cd] text-[#a52f0f]"><Mail className="ml-[15px] shrink-0" size={23} /><input
                className="min-w-0 flex-1 !w-auto !min-h-0 !border-0 !bg-transparent !p-[10px_14px] !font-sans !font-normal !text-[#54220e] focus:!outline-none [&:-webkit-autofill]:!bg-[#f5e4cd] [&:-webkit-autofill]:!text-[#441901] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#f5e4cd_inset]"
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => updateEmail(e.target.value)}
                autoComplete="email"
              /></div>
            </label>
            <label className="gap-[7px] font-serif text-[21px] font-normal text-[#54220e]">
              Password
              <div className="relative h-[52px] w-full overflow-hidden border border-[#a87652] bg-[#f5e4cd]">
                <LockKeyhole className="absolute left-[15px] top-[13px] text-[#a52f0f]" size={24} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => updatePassword(e.target.value)}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  className="!min-h-0 !w-full !border-0 !bg-transparent !p-[10px_48px_10px_54px] !font-sans !font-normal !text-[#54220e] focus:!outline-none [&:-webkit-autofill]:!bg-[#f5e4cd] [&:-webkit-autofill]:!text-[#441901] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#f5e4cd_inset]"
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
                <label className="gap-[7px] font-serif text-[21px] font-normal text-[#54220e]">
                  Confirm password
                  <input
                    className="!min-h-[52px] !rounded-none !border !border-[#a87652] !bg-[#f5e4cd] !font-sans !font-normal !text-[#54220e]"
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
              <div className="flex flex-wrap items-center justify-between gap-4 font-serif text-[18px] font-normal text-[#54220e]">
                <label className="!m-0 !flex !flex-row !items-center !gap-[9px] !whitespace-nowrap !font-serif !text-[18px] !font-normal">
                  <input className="!m-0 !h-[22px] !min-h-0 !w-[22px] accent-[#a52f0f]" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
                </label>
                <Link className="text-[#b7471a] underline underline-offset-2" to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            <button className="min-h-[57px] w-full rounded-none border-0 bg-[#642c14] font-['Crimson_Text'] text-[32px] font-bold text-[#fff8ed] hover:bg-[#54220e]" type="submit" disabled={busy}>
              {busy ? (register ? 'Creating account…' : 'Logging in…') : register ? 'Create account' : 'Login'}
            </button>
          </form>
        )}
        {!register && !success && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 font-sans text-sm text-[#54220e]">
            <span className="mr-1 font-semibold">Demo accounts:</span>
            {(['guest', 'staff', 'admin'] as const).map((role) => (
              <button
                key={role}
                type="button"
                className="min-h-9 rounded-none border border-[#a87652] bg-transparent px-3 py-1.5 font-sans text-sm font-medium text-[#642c14] hover:bg-[#ead3b5]"
                onClick={() => {
                  setEmail(`${role}@example.com`);
                  setPassword('Prototype123!');
                  setError('');
                }}
              >
                {role === 'guest' ? 'Guest' : role === 'staff' ? 'Staff' : 'Admin'}
              </button>
            ))}
          </div>
        )}
        <p className="mt-[47px] text-center font-serif text-[18px] text-[#54220e]">
          {success ? (
            <Link to="/login">Go to login</Link>
          ) : (
            <Link to={register ? '/login' : '/register'}>{register ? <>Already have an account? <span className="text-[#d54c00] underline underline-offset-2">Login</span></> : <>Don’t have an account? <span className="text-[#d54c00] underline underline-offset-2">Create an account</span></>}</Link>
          )}
        </p>
      </div>
    </div>
  );
};
