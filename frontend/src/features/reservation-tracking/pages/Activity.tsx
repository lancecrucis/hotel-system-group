import { useQuery } from '../../../hooks/useQuery';
import { PageHeader, ErrorBox, Empty, Loading } from '../../../components/ui/common';
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
    <>
      <PageHeader title="Activity log" />
      <ErrorBox message={query.error} />
      <div className="panel flush">
        {query.loading && !query.data ? (
          <Loading />
        ) : query.data?.logs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Team member</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {query.data.logs.map((l) => (
                  <tr key={l.id}>
                    <td>{timestamp(l.created_at)}</td>
                    <td>
                      {l.first_name} {l.last_name}
                    </td>
                    <td>
                      {label(l.action)}
                      <small>{label(l.entity_type)}</small>
                    </td>
                    <td>{l.description}</td>
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
    </>
  );
}
