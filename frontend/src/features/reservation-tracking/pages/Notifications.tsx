import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { Notice } from '../../../types/models';
import { PageHeader, ErrorBox, Empty, Loading } from '../../../components/ui/common';
import { timestamp } from '../../../utils/format';
export function Notifications() {
  const query = useQuery<{ notifications: Notice[] }>('/notifications', 15000),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const notifications = query.data?.notifications ?? [];
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  async function read() {
    setBusy(true);
    try {
      await api('/notifications/read', send('PATCH'));
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <PageHeader
        title="Notifications"
        action={
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#b99673] bg-[#fffaf2] px-4 py-2 font-sans text-xs font-semibold text-[#54220e] transition-colors hover:border-[#8b4d28] hover:bg-[#f7e8d2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || unreadCount === 0}
            onClick={() => {
              void read();
            }}
          >
            <CheckCheck size={17} aria-hidden="true" />
            Mark all as read
          </button>
        }
      />
      <div className="-mt-4 mb-6 flex items-center gap-2 text-sm text-[#806348]">
        <span className={`h-2 w-2 rounded-full ${unreadCount ? 'bg-[#b7471a]' : 'bg-[#9b754f]'}`} aria-hidden="true" />
        {unreadCount ? `${unreadCount} unread ${unreadCount === 1 ? 'update' : 'updates'}` : 'You’re all caught up'}
      </div>
      <ErrorBox message={query.error || error} />
      {query.loading && !query.data ? (
        <Loading />
      ) : notifications.length ? (
        <div className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_8px_24px_rgba(84,34,14,.08)]">
          {notifications.map((n) => (
            <article key={n.id} className={`relative flex gap-4 border-b border-[#eadfce] p-5 last:border-b-0 max-[500px]:p-4 ${n.is_read ? 'bg-[#fffaf2]' : 'bg-[#f7e8d2] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#b7471a]'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${n.is_read ? 'bg-[#f3e1c7] text-[#806348]' : 'bg-[#ead3b5] text-[#a64b1c]'}`}>
                <Bell size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <strong className="font-['Gelasio'] text-lg font-normal leading-tight text-[#441901]">{n.title}</strong>
                  <small className="shrink-0 pt-0.5 text-xs text-[#806348]">{timestamp(n.created_at)}</small>
                </div>
                <p className="mb-0 mt-2 text-sm leading-relaxed text-[#70462c]">{n.message}</p>
                {n.reservation_id && <Link className="mt-3 inline-block text-xs font-semibold text-[#8b3b24] underline decoration-[#c1844c] underline-offset-4 hover:text-[#54220e]" to={`/reservations/${n.reservation_id}`}>View reservation</Link>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="You’re all caught up">
          <p>Your reservation updates will appear here.</p>
        </Empty>
      )}
    </div>
  );
}
