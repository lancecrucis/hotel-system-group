import { useQuery } from '../../../hooks/useQuery';
import { ErrorBox, Empty, Loading } from '../../../components/ui/common';
import { label, timestamp } from '../../../utils/format';
interface Log {
  id: string;
  action: string;
  entity_type: string;
  description: string;
  first_name: string;
  last_name: string;
  created_at: string;
}
export function Activity() {
  const query = useQuery<{ logs: Log[] }>('/activity', 30000);
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-6 max-[650px]:items-start max-[650px]:flex-col">
        <div>
          <p className="mb-2 text-sm font-medium text-[#98785b]">Staff audit trail</p>
          <h1 className="m-0 font-['Gelasio'] text-[34px] font-normal leading-tight tracking-[-.03em] text-[#441901] max-[650px]:text-[29px]">Activity log</h1>
          <p className="mb-0 mt-2 max-w-[560px] text-sm leading-relaxed text-[#806348]">See the latest changes made across reservations, rooms, and restaurant service.</p>
        </div>
        {query.data && <span className="pb-1 text-sm text-[#806348]">{query.data.logs.length} recent {query.data.logs.length === 1 ? 'event' : 'events'}</span>}
      </header>
      <ErrorBox message={query.error} />
      <div className="overflow-hidden rounded-2xl border border-[#d8bfa0] bg-[#fffaf2] shadow-[0_10px_28px_rgba(84,34,14,.06)]">
        {query.loading && !query.data ? (
          <Loading />
        ) : query.data?.logs.length ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse bg-[#fffaf2] text-left text-xs">
              <thead>
                <tr>
                  <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Time</th>
                  <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Team member</th>
                  <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Action</th>
                  <th className="whitespace-nowrap bg-[#f3e1c7] px-5 py-4 text-xs font-semibold text-[#54220e]">Details</th>
                </tr>
              </thead>
              <tbody>
                {query.data.logs.map((l) => (
                  <tr className="border-b border-[#eadfce] last:border-b-0" key={l.id}>
                    <td className="whitespace-nowrap align-top px-5 py-4 text-[#806348]">{timestamp(l.created_at)}</td>
                    <td className="align-top px-5 py-4 font-semibold text-[#54220e]">
                      {l.first_name} {l.last_name}
                    </td>
                    <td className="align-top px-5 py-4 text-[#54220e]">
                      <strong className="font-semibold">{label(l.action)}</strong>
                      <span className="mt-1 inline-flex rounded-full bg-[#f3e1c7] px-2 py-1 text-[10px] font-semibold text-[#806348]">{label(l.entity_type)}</span>
                    </td>
                    <td className="max-w-[520px] align-top px-5 py-4 leading-relaxed text-[#70462c]">{l.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No staff activity yet">
            <p>Changes made by the team will appear here.</p>
          </Empty>
        )}
      </div>
    </div>
  );
}
