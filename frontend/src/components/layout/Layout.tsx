import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  UtensilsCrossed,
  LayoutDashboard,
  ClipboardList,
  Bell,
  Settings,
  Users,
  History,
  LogOut,
  UserRound,
  ArrowUpRight,
  UserPlus,
  Home,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import type { Notice } from '../../types/models';
import { useState } from 'react';
import { ErrorBox } from '../ui/common';

function NotificationLink() {
  const { data } = useQuery<{ notifications: Notice[] }>('/notifications', 30000);
  const count = data?.notifications.filter((n) => !n.is_read).length ?? 0;
  return (
    <NavLink className="relative p-2 text-[#1d1d1d]" to="/notifications" aria-label="Notifications" title="Notifications">
      <Bell size={20} />
      {count > 0 && <span className="absolute -right-0.5 top-0 min-w-[15px] rounded-[20px] bg-[#161616] px-1 py-px text-center text-[9px] text-white">{count}</span>}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuth(),
    navigate = useNavigate(),
    [error, setError] = useState('');
  const staff = user && user.role !== 'customer';
  return (
    <div className="min-h-screen">
      <div className="min-w-0 w-full">
        <header className="sticky top-0 z-20 border-b border-[#e8e8e8] bg-white/[.94] backdrop-blur-[20px]">
          <div className="mx-auto grid min-h-24 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-9 py-[22px] max-[1200px]:gap-4 max-[1200px]:px-7 max-[800px]:grid-cols-[1fr_auto] max-[800px]:gap-[18px] max-[800px]:px-5 max-[500px]:gap-x-2.5 max-[500px]:gap-y-4 max-[500px]:p-4">
            <Link className="flex items-center gap-[11px] whitespace-nowrap text-[15px] font-semibold tracking-[-.4px] text-[#1d1d1d] no-underline max-[1200px]:text-[13px] max-[500px]:gap-[7px] max-[500px]:text-xs" to={staff ? '/overview' : '/rooms'}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#161616] text-white max-[500px]:h-8 max-[500px]:w-8">
                <BedDouble size={24} />
              </span>
              <span>Hotel &amp; Restaurant</span>
            </Link>
            <nav className="flex gap-[3px] rounded-full border border-[#e9e9e9] bg-[#efefef] p-1 max-[800px]:col-span-full max-[800px]:row-start-2 max-[800px]:justify-self-center max-[500px]:w-full max-[500px]:max-w-[360px]" aria-label="Booking type">
              <NavLink className={({ isActive }) => `flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-[19px] py-2.5 text-[13px] font-medium text-[#6e6e6e] transition hover:bg-[#e5e5e5] max-[500px]:flex-1 max-[500px]:px-2.5 max-[500px]:text-xs ${isActive ? 'bg-white text-[#161616] shadow-[0_1px_4px_#00000014,0_0_0_1px_#00000004]' : ''}`} to="/rooms">
                <BedDouble size={18} />
                Book a room
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-[19px] py-2.5 text-[13px] font-medium text-[#6e6e6e] transition hover:bg-[#e5e5e5] max-[500px]:flex-1 max-[500px]:px-2.5 max-[500px]:text-xs ${isActive ? 'bg-white text-[#161616] shadow-[0_1px_4px_#00000014,0_0_0_1px_#00000004]' : ''}`} to="/dining">
                <UtensilsCrossed size={18} />
                Reserve a table
              </NavLink>
            </nav>
            <div className="flex min-w-0 items-center justify-end gap-4 max-[1200px]:gap-2.5 max-[800px]:col-start-2 max-[800px]:row-start-1 max-[500px]:gap-1.5">
              {!staff && (
                <Link className="relative p-2 text-[#1d1d1d]" to="/" title="Hotel home" aria-label="Hotel home">
                  <Home size={18} />
                </Link>
              )}
              {user ? (
                <>
                  <NavLink
                    className="flex items-center gap-[7px] whitespace-nowrap text-xs text-[#1d1d1d] max-[1200px]:[&>span]:sr-only"
                    to="/reservations"
                    title={staff ? 'All reservations' : 'My reservations'}
                  >
                    <ClipboardList size={18} />
                    <span>{staff ? 'All reservations' : 'My reservations'}</span>
                  </NavLink>
                  <NotificationLink />
                  <Link className="flex items-center gap-[7px] whitespace-nowrap text-xs text-[#1d1d1d] max-[500px]:[&>span]:hidden" to="/profile" title="Your profile">
                    <UserRound size={17} />
                    <span>{user.first_name}</span>
                  </Link>
                  <button
                    className="min-h-9 border-0 bg-transparent p-2 text-[#6e6e6e] hover:text-[#1d1d1d]"
                    title="Sign out"
                    aria-label="Sign out"
                    onClick={() => {
                      void logout()
                        .then(() => navigate('/login'))
                        .catch((e) => setError(e.message));
                    }}
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <Link className="inline-flex min-h-[34px] items-center justify-center gap-2 rounded-full border border-[#dedede] bg-white px-3 py-[7px] text-xs font-semibold leading-[1.35] text-[#1d1d1d] no-underline hover:border-[#bdbdbd] hover:bg-[#f5f5f5]" to="/login">
                  Sign in <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </div>
          {staff && (
            <nav className="flex flex-wrap justify-center gap-3 px-6 pb-3.5 max-[800px]:justify-start max-[800px]:flex-nowrap max-[800px]:gap-1 max-[800px]:overflow-auto max-[800px]:px-4" aria-label="Staff navigation">
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] rounded-md px-3 py-2 text-xs text-[#6e6e6e] whitespace-nowrap ${isActive ? 'bg-[#ededed] text-[#161616]' : ''}`} to="/overview">
                <LayoutDashboard size={16} />
                Overview
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] rounded-md px-3 py-2 text-xs text-[#6e6e6e] whitespace-nowrap ${isActive ? 'bg-[#ededed] text-[#161616]' : ''}`} to="/walk-in">
                <UserPlus size={16} />
                New walk-in
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] rounded-md px-3 py-2 text-xs text-[#6e6e6e] whitespace-nowrap ${isActive ? 'bg-[#ededed] text-[#161616]' : ''}`} to="/manage/rooms">
                <BedDouble size={16} />
                Room inventory
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] rounded-md px-3 py-2 text-xs text-[#6e6e6e] whitespace-nowrap ${isActive ? 'bg-[#ededed] text-[#161616]' : ''}`} to="/manage/restaurant">
                <Settings size={16} />
                Restaurant settings
              </NavLink>
              {user.role === 'admin' && (
                <NavLink className={({ isActive }) => `flex items-center gap-[7px] rounded-md px-3 py-2 text-xs text-[#6e6e6e] whitespace-nowrap ${isActive ? 'bg-[#ededed] text-[#161616]' : ''}`} to="/manage/users">
                  <Users size={16} />
                  Users &amp; roles
                </NavLink>
              )}
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] rounded-md px-3 py-2 text-xs text-[#6e6e6e] whitespace-nowrap ${isActive ? 'bg-[#ededed] text-[#161616]' : ''}`} to="/activity">
                <History size={16} />
                Activity log
              </NavLink>
            </nav>
          )}
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-9 pb-16 pt-10 max-[1200px]:p-7 max-[800px]:px-5 max-[800px]:py-[25px] max-[500px]:px-4 max-[500px]:py-[22px]">
          <ErrorBox message={error} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
