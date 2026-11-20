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
              className={`h-1 flex-1 rounded-sm ${passed === tests.length ? 'bg-green-600' : n <= passed ? 'bg-red-600' : 'bg-[#d8bfa0]'}`}
          />
        ))}
      </div>
      <small className={passed === tests.length ? 'text-green-700' : 'text-red-700'}>{tests.filter((t) => !t.pass).map((t) => t.label).join(' · ') || 'Strong password'}</small>
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
      const submittedPhone = register ? '+63 ' + String(fields.phone_number ?? '').replace(/^\+63\s*/, '').trim() : undefined;
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
          ...(register ? { password: submittedPassword, confirm_password: submittedConfirm, phone_number: submittedPhone } : { password: submittedPassword, remember_me: remember }),
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
    <div className={`relative z-[1] ${register ? 'w-[min(100%,432px)]' : 'w-[min(100%,430px)]'}`}>
      <>
        <div className={`${register ? 'mb-3' : 'mb-2'} text-center`}>

          <img className={`mx-auto block ${register ? 'w-[58px]' : 'w-[64px]'}`} 
          src="/images/login%20elements/logo%20girl%20image.png" 
          alt="" />

          <img className={`mx-auto block ${register ? 'w-[min(100%,336px)]' : 'w-[min(100%,336px)]'}`} 
          src="/images/login%20elements/logo%20title%20page.png" 
          alt="La Illustrada Hotel" />

          {register ? <h1 className="mt-1 font-['Gelasio'] text-[19px] font-normal uppercase tracking-[.04em] text-[#54220e]">Create your account</h1> : <>
            <div className="mt-1 flex items-center justify-center gap-2 font-serif text-lg text-[#54220e]"><i className="h-px w-12 bg-[#b99673]" />HOTEL<i className="h-px w-12 bg-[#b99673]" /></div>
            <h1 className="mt-1 font-['Gelasio'] text-[30px] font-normal leading-tight text-[#441901]">Welcome Back</h1>
            <p className="mt-2 font-sans text-xs text-[#7d746b]">Sign in to continue your stay and dining experience</p>
          </>}
        </div>
      </>
      <div>
        <ErrorBox message={error} />
        {success && <Success message={success} />}
        {!success && (
          <form onSubmit={submit} className={`flex flex-col ${register ? 'gap-1.5' : 'gap-4'}`}>
            {register && (
              <div className={`grid ${register ? 'grid-cols-2 gap-x-2 gap-y-1.5' : 'grid-cols-2 gap-[18px] max-[500px]:grid-cols-1'}`}>
                <label className="flex flex-col gap-[7px] font-serif text-sm font-normal text-[#54220e]">
                  First name
                  <input className={`${register ? '!min-h-[36px] !rounded-[9px] !border-[#b99673] !bg-transparent' : '!min-h-[52px] !rounded-none !border-[#a87652] !bg-[#f5e4cd]'} !border !px-3 !py-1 !font-sans !font-normal !text-[#54220e]`} name="first_name" required maxLength={80} autoComplete="given-name" placeholder={register ? 'First Name' : undefined} />
                </label>
                <label className="flex flex-col gap-[7px] font-serif text-sm font-normal text-[#54220e]">
                  Last name
                  <input className={`${register ? '!min-h-[36px] !rounded-[9px] !border-[#b99673] !bg-transparent' : '!min-h-[52px] !rounded-none !border-[#a87652] !bg-[#f5e4cd]'} !border !px-3 !py-1 !font-sans !font-normal !text-[#54220e]`} name="last_name" required maxLength={80} autoComplete="family-name" placeholder={register ? 'Last Name' : undefined} />
                </label>
                <label className="col-span-full flex flex-col gap-[7px] font-serif text-sm font-normal text-[#54220e] max-[500px]:col-span-auto">
                  Phone number
                  <div className={`flex h-11 min-w-0 items-center overflow-hidden border ${register ? 'rounded-[10px] border-[#b99673] bg-transparent' : 'border-[#a87652] bg-[#f5e4cd]'} text-[#54220e]`}><span className="ml-[15px] shrink-0 select-none font-sans text-base text-[#7d746b]">+63</span><input
                    className="min-w-0 flex-1 !w-auto !min-h-0 !border-0 !bg-transparent !p-[10px_14px] !font-sans !font-normal !text-[#54220e] focus:!outline-none [&:-webkit-autofill]:!bg-[#f5e4cd] [&:-webkit-autofill]:!text-[#441901] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#f5e4cd_inset]"
                    name="phone_number"
                    type="tel"
                    required
                    defaultValue="917 123 4567"
                    placeholder="917 123 4567"
                    pattern="[0-9 ]{9,14}"
                    title="Digits and spaces only; +63 is already prefixed"
                    minLength={9}
                    maxLength={15}
                    autoComplete="tel"
                  /></div>
                </label>
              </div>
            )}
            {register && <label className="flex flex-col gap-[7px] font-serif text-sm text-[#54220e]">Date of birth<input className="!min-h-[44px] !rounded-[10px] !border !border-[#b99673] !bg-transparent !px-4 !py-2 !font-sans !text-sm" type="date" name="date_of_birth" /></label>}
            <label className={`flex flex-col ${register ? 'gap-[5px]' : 'gap-2'} font-serif ${register ? 'text-sm' : 'text-base'} font-normal text-[#54220e]`}>
              Email address
              <div className={`flex ${register ? 'h-11' : 'h-12'} min-w-0 items-center overflow-hidden rounded-[10px] border border-[#b99673] bg-transparent text-[#a52f0f]`}><Mail className="ml-3 shrink-0" size={18} /><input
                className="min-w-0 flex-1 !w-auto !min-h-0 !border-0 !bg-transparent !p-[10px_14px] !font-sans !font-normal !text-[#54220e] focus:!outline-none [&:-webkit-autofill]:!bg-[#f5e4cd] [&:-webkit-autofill]:!text-[#441901] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#f5e4cd_inset]"
                type="email"
                name="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => updateEmail(e.target.value)}
                autoComplete="email"
              /></div>
            </label>
            <label className={`flex flex-col ${register ? 'gap-[5px]' : 'gap-2'} font-serif ${register ? 'text-sm' : 'text-base'} font-normal text-[#54220e]`}>
              Password
              <div className={`relative ${register ? 'h-11' : 'h-12'} w-full overflow-hidden rounded-[10px] border border-[#b99673] bg-transparent`}>
                {!register && <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a52f0f]" size={18} aria-hidden="true" />}
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => updatePassword(e.target.value)}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={register ? undefined : 'Password'}
                  className={`!min-h-0 !w-full !border-0 !bg-transparent !p-[10px_42px_10px_14px] !font-sans !font-normal !text-[#54220e] focus:!outline-none ${register ? '' : '!pl-[44px]'} [&:-webkit-autofill]:!bg-[#f5e4cd] [&:-webkit-autofill]:!text-[#441901] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#f5e4cd_inset]`}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 min-h-9 -translate-y-1/2 border-0 bg-transparent p-2 text-[#806348] hover:text-[#441901]"
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
                <label className="flex flex-col gap-[7px] font-serif text-sm font-normal text-[#54220e]">
                  Confirm password
                  <div className={`relative h-11 w-full overflow-hidden border ${register ? 'rounded-[10px] border-[#b99673] bg-transparent' : 'border-[#a87652] bg-[#f5e4cd]'}`}>
                    {!register && <LockKeyhole className="absolute left-[15px] top-[13px] text-[#a52f0f]" size={24} />}
                    <input
                      className="!min-h-0 !w-full !border-0 !bg-transparent !p-[10px_42px_10px_14px] !font-sans !font-normal !text-[#54220e] focus:!outline-none [&:-webkit-autofill]:!bg-[#f5e4cd] [&:-webkit-autofill]:!text-[#441901] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#f5e4cd_inset]"
                      type={showPassword ? 'text' : 'password'}
                      name="confirm_password"
                      required
                      minLength={8}
                      maxLength={128}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-1 top-1/2 min-h-9 -translate-y-1/2 border-0 bg-transparent p-2 text-[#806348] hover:text-[#441901]"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              </>
            )}
            {!register && (
              <div className="flex flex-wrap items-center justify-between gap-3 font-sans text-sm font-normal text-[#54220e]">
                <label className="!m-0 !flex !flex-row !items-center !gap-2 !whitespace-nowrap !font-sans !text-sm !font-normal">
                  <input className="!m-0 !h-5 !min-h-0 !w-5 shrink-0 accent-[#a52f0f]" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
                </label>
                <Link className="text-xs text-[#b7471a] underline underline-offset-2" to="/forgot-password">Forgot password</Link>
              </div>
            )}
            <button className="min-h-11 w-full rounded-[9px] border-0 bg-[#642c14] px-4 py-2 font-['Crimson_Text'] text-xl font-bold text-[#fff8ed] hover:bg-[#54220e]" type="submit" disabled={busy}>
              {busy ? (register ? 'Creating account…' : 'Logging in…') : register ? 'Create account' : 'Login'}
            </button>
          </form>
        )}
        {!register && !success && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 font-sans text-sm text-[#54220e]">
            <span className="mr-1 font-semibold">Demo accounts:</span>
            {(['guest', 'staff', 'admin'] as const).map((role) => (
              <button
                key={role}
                type="button"
                className="min-h-7 rounded-none border border-[#a87652] bg-transparent px-2.5 py-1 font-sans text-xs font-medium text-[#642c14] hover:bg-[#ead3b5]"
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
        <p className="mt-3 text-center font-serif text-sm text-[#54220e]">
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
