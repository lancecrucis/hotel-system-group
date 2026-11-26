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
import { ChatWidget } from '../../landing/components/ChatWidget';
export function Reservations() {
  const { user } = useAuth(),
    initial = { search: '', type: 'all', status: 'all' },
    [filters, setFilters] = useState(initial),
    [search, setSearch] = useState(initial),
    query = useQuery<{ reservations: Reservation[] }>(`/reservations?${new URLSearchParams(search)}`, 30000);
  return (
    <>
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-6 max-[650px]:items-start max-[650px]:flex-col">
        <div>
          <p className="mb-2 text-sm font-medium text-[#98785b]">{user!.role === 'customer' ? 'Your stays and dining' : 'Reservations desk'}</p>
          <h1 className="m-0 font-['Gelasio'] text-[34px] font-normal leading-tight tracking-[-.03em] text-[#441901] max-[650px]:text-[29px]">
            {user!.role === 'customer' ? 'My reservations' : 'Reservations'}
          </h1>
          <p className="mb-0 mt-2 max-w-[540px] text-sm leading-relaxed text-[#806348]">
            {user!.role === 'customer'
              ? 'Keep your hotel stays and restaurant bookings together in one place.'
              : 'Search and manage hotel stays and dining reservations.'}
          </p>
        </div>
        <Link className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#642c14] bg-[#642c14] px-5 py-2.5 text-sm font-semibold text-[#fff8ee] no-underline transition-colors hover:bg-[#54220e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] max-[650px]:w-full" to={user!.role === 'customer' ? '/rooms' : '/walk-in'}>
          <Plus size={17} aria-hidden="true" />
          {user!.role === 'customer' ? 'New booking' : 'New walk-in'}
        </Link>
      </header>
      <form
        className="grid grid-cols-[minmax(220px,1.4fr)_minmax(150px,.75fr)_minmax(160px,.8fr)_auto] items-end gap-3 rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] p-4 shadow-[0_8px_24px_rgba(84,34,14,.055)] max-[900px]:grid-cols-2 max-[500px]:grid-cols-1"
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
              className="!rounded-xl !border-[#ddcbb5] !bg-[#fffdf9] !pl-10 !pr-3 text-sm focus:!border-[#9b6a43] focus:!ring-2 focus:!ring-[#9b6a43]/15"
              aria-label="Search by reference or guest name"
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
      <div className={user!.role === 'customer' ? '' : 'overflow-hidden rounded-2xl border border-[#e5d4bf] bg-[#fffaf2] shadow-[0_10px_28px_rgba(84,34,14,.06)]'}>
        {query.loading && !query.data ? (
          <Loading />
        ) : (
          query.data && (user!.role === 'customer'
            ? <MyReservationCards reservations={query.data.reservations} />
            : <ReservationTable reservations={query.data.reservations} />)
        )}
      </div>
    </div>
    {user!.role === 'customer' && <ChatWidget />}
    </>
  );
}
