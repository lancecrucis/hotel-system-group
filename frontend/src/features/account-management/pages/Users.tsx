import { useState } from 'react';
import { ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { User } from '../../../types/models';
import { ErrorBox, Success, Loading, Badge } from '../../../components/ui/common';
export function Users() {
  const query = useQuery<{ users: User[] }>('/users'),
    { user } = useAuth(),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState('');
  const users = query.data?.users ?? [];
  const roleCards = [
    { role: 'admin' as const, title: 'Administrators', description: 'Full operations and team access.', icon: ShieldCheck },
    { role: 'staff' as const, title: 'Operations staff', description: 'Reservations, rooms, and dining work.', icon: UsersRound },
    { role: 'customer' as const, title: 'Guest accounts', description: 'Personal bookings and notifications.', icon: UserRound },
  ];
  async function change(id: string, role: string) {
    setBusy(id);
    setError('');
    try {
      await api(`/users/${id}/role`, send('PATCH', { role }));
      setMessage('Role updated. The user must sign in again before the new access level applies.');
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-6 max-[650px]:items-start max-[650px]:flex-col">
        <div>
          <p className="mb-2 text-sm font-medium text-[#98785b]">Access control</p>
          <h1 className="m-0 font-['Gelasio'] text-[34px] font-normal leading-tight tracking-[-.03em] text-[#441901] max-[650px]:text-[29px]">Team access</h1>
          <p className="mb-0 mt-2 max-w-[560px] text-sm leading-relaxed text-[#806348]">Manage who can work in hotel operations and which level of access each account receives.</p>
        </div>
        {query.data && <span className="pb-1 text-sm text-[#806348]">{users.length} {users.length === 1 ? 'account' : 'accounts'}</span>}
      </header>
      <ErrorBox message={query.error || error} />
      <Success message={message} />
      <section aria-label="Access levels" className="grid grid-cols-3 gap-4 max-[800px]:grid-cols-2 max-[500px]:grid-cols-1">
        {roleCards.map((card) => {
          const count = users.filter((u) => u.role === card.role).length;
          const Icon = card.icon;
          return (
            <article className="rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-5 shadow-[0_8px_24px_rgba(84,34,14,.055)]" key={card.role}>
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f3e1c7] text-[#a64b1c]"><Icon size={20} aria-hidden="true" /></span>
                <strong className="font-['Gelasio'] text-3xl font-normal text-[#441901]">{count}</strong>
              </div>
              <h2 className="mb-0 mt-4 !font-sans text-sm !font-semibold text-[#54220e]">{card.title}</h2>
              <p className="mb-0 mt-1 text-xs leading-relaxed text-[#806348]">{card.description}</p>
            </article>
          );
        })}
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_10px_28px_rgba(84,34,14,.06)]" aria-labelledby="people-and-roles-heading">
        <div className="border-b border-[#eadfce] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f3e1c7] text-[#a64b1c]"><ShieldCheck size={18} aria-hidden="true" /></span>
            <div>
              <h2 id="people-and-roles-heading" className="m-0 !font-sans text-lg !font-semibold text-[#54220e]">People and roles</h2>
              <p className="mb-0 mt-1 text-sm leading-relaxed text-[#806348]">Assign the minimum access each person needs to do their work.</p>
            </div>
          </div>
          <p className="mb-0 mt-4 rounded-xl bg-[#f3e1c7] p-3 text-xs leading-relaxed text-[#70462c]">Changing a role signs that user out. Their new access level will be applied the next time they sign in.</p>
        </div>
        {query.loading && !query.data ? (
          <Loading />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse bg-[#fffaf2] text-left text-xs">
              <thead>
                <tr>
                  {['Name', 'Email', 'Phone', 'Current role', 'Change access'].map((heading) => <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]" key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {query.data?.users.map((u) => (
                  <tr className="border-b border-[#eadfce] last:border-b-0" key={u.id}>
                    <td className="align-top px-5 py-4">
                      <span className="font-semibold text-[#54220e]">{u.first_name} {u.last_name}</span>
                      {u.id === user!.id && <small className="mt-1 block text-xs text-[#98785b]">Current account</small>}
                    </td>
                    <td className="align-top px-5 py-4 text-[#70462c]">{u.email}</td>
                    <td className="align-top px-5 py-4 text-[#70462c]">{u.phone_number}</td>
                    <td className="align-top px-5 py-4">
                      <Badge status={u.role} />
                    </td>
                    <td className="align-top px-5 py-4">
                      <select
                        className="!min-h-10 !rounded-lg !border-[#d8bfa0] !bg-[#fffdf9] !px-3 !py-2 text-xs text-[#54220e] focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Role for ${u.email}`}
                        title={u.id === user!.id ? 'You cannot change your own role.' : undefined}
                        disabled={u.id === user!.id || busy === u.id}
                        value={u.role}
                        onChange={(e) => {
                          void change(u.id, e.target.value);
                        }}
                      >
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
