import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { useQuery } from '../../../hooks/useQuery';
import type { Reservation } from '../../../types/models';
import { ErrorBox, Loading } from '../../../components/ui/common';
import { ReservationTable } from '../components/ReservationTable';
import { MyReservationCards } from '../components/MyReservationCards';
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
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#642c14] bg-[#642c14] px-5 py-3 font-serif font-bold text-[#fff8ee] no-underline hover:bg-[#54220e]" to="/rooms">
            <Plus size={17} />
            New booking
          </Link>
        }
      />
      <form
        className="mb-5 grid grid-cols-[1fr_1fr_.65fr_auto] items-end gap-4 border border-[#c8a783] bg-[#fff8ee] p-[26px] max-[1200px]:grid-cols-2 max-[500px]:grid-cols-1 max-[500px]:gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch({ ...filters });
          query.reload();
        }}
      >
        <label className="gap-1.5 text-xs font-semibold text-[#70462c]">
          Search reservations
          <span className="relative mt-1 block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9b8063]" aria-hidden="true" />
          <input
            className="rounded-xl border-[#ddcbb5] bg-[#fffdf9] pl-9 text-sm focus:border-[#9b6a43] focus:ring-2 focus:ring-[#9b6a43]/15"
            placeholder="Reference or guest name"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          </span>
        </label>
        <label className="gap-1.5 text-xs font-semibold text-[#70462c]">
          Type
          <select className="mt-1 rounded-xl border-[#ddcbb5] bg-[#fffdf9] text-sm focus:border-[#9b6a43] focus:ring-2 focus:ring-[#9b6a43]/15" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="all">All reservations</option>
            <option value="hotel">Hotel</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </label>
        <label className="gap-1.5 text-xs font-semibold text-[#70462c]">
          Status
          <select className="mt-1 rounded-xl border-[#ddcbb5] bg-[#fffdf9] text-sm focus:border-[#9b6a43] focus:ring-2 focus:ring-[#9b6a43]/15" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
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
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-2.5 text-sm font-semibold text-[#fff8ee] transition-colors hover:bg-[#54220e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] max-[900px]:col-span-2 max-[500px]:col-span-1">
          <Search size={16} aria-hidden="true" />
          Apply filters
        </button>
      </form>
      <ErrorBox message={query.error} />
      <div className="overflow-hidden border border-[#c8a783] bg-[#fff8ee] p-0">
        {query.loading && !query.data ? (
          <Loading />
        ) : (
          query.data && (user!.role === 'customer'
            ? <MyReservationCards reservations={query.data.reservations} />
            : <ReservationTable reservations={query.data.reservations} />)
        )}
      </div>
    </div>
  );
}
