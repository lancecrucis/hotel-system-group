import { useState } from 'react';
import { useQuery } from '../../../hooks/useQuery';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { User } from '../../../types/models';
import { PageHeader, ErrorBox, Success, Loading, Badge } from '../../../components/ui/common';
export function Users() {
  const query = useQuery<{ users: User[] }>('/users'),
    { user } = useAuth(),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState('');
  async function change(id: string, role: string) {
    setBusy(id);
    setError('');
    try {
      await api(`/users/${id}/role`, send('PATCH', { role }));
      setMessage('Role updated. Sign in again to apply.');
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <PageHeader title="Users & roles" />
      <ErrorBox message={query.error || error} />
      <Success message={message} />
      <div className="overflow-hidden rounded-[20px] border border-[#e8e8e8] bg-white">
        {query.loading && !query.data ? (
          <Loading />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  {['Name', 'Email', 'Phone', 'Role', 'Assign role'].map((heading) => <th className="whitespace-nowrap bg-[#fcfcfc] px-5 py-[17px] text-[10px] font-semibold uppercase tracking-[.6px] text-[#888]" key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {query.data?.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.first_name} {u.last_name}
                      {u.id === user!.id && <small>You</small>}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone_number}</td>
                    <td>
                      <Badge status={u.role} />
                    </td>
                    <td>
                      <select
                        aria-label={`Role for ${u.email}`}
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
      </div>
    </>
  );
}
