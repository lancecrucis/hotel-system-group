import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { useQuery } from '../../../hooks/useQuery';
import type { Reservation } from '../../../types/models';
import { PageHeader, ErrorBox, Loading } from '../../../components/ui/common';
import { ReservationTable } from '../components/ReservationTable';
import { label } from '../../../utils/format';
export function Reservations() {
  const { user } = useAuth(),
    initial = { search: '', type: 'all', status: 'all' },
    [filters, setFilters] = useState(initial),
    [search, setSearch] = useState(initial),
    query = useQuery<{ reservations: Reservation[] }>(`/reservations?${new URLSearchParams(search)}`, 30000);
  return (
    <>
      <PageHeader
        title={user!.role === 'customer' ? 'My reservations' : 'All reservations'}
        action={
          <Link className="button" to="/rooms">
            <Plus size={17} />
            New booking
          </Link>
        }
      />
      <form
        className="panel search-form reservation-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch({ ...filters });
          query.reload();
        }}
      >
        <label>
          Search
          <input
            placeholder="Reference or guest name"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
        <label>
          Type
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="all">All reservations</option>
            <option value="hotel">Hotel</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="all">All statuses</option>
            {[
              'pending',
              'confirmed',
              'checked_in',
              'checked_out',
              'arrived',
              'seated',
              'completed',
              'cancelled',
              'expired',
              'no_show',
            ].map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary">
          <Search size={17} />
          Search
        </button>
      </form>
      <ErrorBox message={query.error} />
      <div className="panel flush">
        {query.loading && !query.data ? (
          <Loading />
        ) : (
          query.data && <ReservationTable reservations={query.data.reservations} />
        )}
      </div>
    </>
  );
}
