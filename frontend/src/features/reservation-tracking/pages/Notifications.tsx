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
    <>
      <PageHeader
        title="Notifications"
        action={
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              void read();
            }}
          >
            <CheckCheck size={17} />
            Mark all as read
          </button>
        }
      />
      <ErrorBox message={query.error || error} />
      {query.loading && !query.data ? (
        <Loading />
      ) : query.data?.notifications.length ? (
        <div className="overflow-hidden border border-[#c8a783] bg-[#fff8ee]">
          {query.data.notifications.map((n) => (
            <article key={n.id} className={`flex gap-[13px] border-b border-[#d8bfa0] p-5 last:border-b-0 ${n.is_read ? 'bg-[#fff8ee]' : 'bg-[#f1dfc8]'}`}>
              <Bell className="mt-0.5 shrink-0 text-[#a64b1c]" size={19} />
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <strong className="font-['Gelasio'] text-lg font-normal text-[#441901]">{n.title}</strong>
                  <small className="text-[#806348]">{timestamp(n.created_at)}</small>
                </div>
                <p>{n.message}</p>
                {n.reservation_id && <Link to={`/reservations/${n.reservation_id}`}>View reservation →</Link>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="You’re all caught up">
          <p>Your reservation updates will appear here.</p>
        </Empty>
      )}
    </>
  );
}
