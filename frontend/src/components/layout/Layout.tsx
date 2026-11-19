import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
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
    <NavLink className="relative p-2 text-[#f3e1c7] transition-colors hover:text-white" to="/notifications" aria-label="Notifications" title="Notifications">
      <Bell size={20} />
      {count > 0 && <span className="absolute -right-0.5 top-0 min-w-[15px] rounded-full bg-[#b8763c] px-1 py-px text-center text-[9px] text-white">{count}</span>}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuth(),
    navigate = useNavigate(),
    location = useLocation(),
    [error, setError] = useState('');
  const staff = user && user.role !== 'customer';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#f3e1c7] text-[#54220e]">
       <header className="
            sticky top-0 z-20
            h-[93px]
            bg-[url('/images/login%20elements/navbar%20bg.png')]
            bg-[length:auto_100%] bg-center bg-no-repeat
            text-[#f8ead5]
            max-[600px]:h-[76px]
        ">
          <div className="mx-auto flex h-full w-full items-center gap-[clamp(1rem,3.25vw,3.375rem)] px-[clamp(1rem,5vw,14.5rem)] max-[600px]:justify-between max-[600px]:gap-3 max-[600px]:px-4">
            <Link className="flex w-[clamp(8rem,14vw,14.6875rem)] min-w-0 shrink items-center justify-center no-underline max-[600px]:justify-start" to="/" aria-label="La Illustrada Hotel home">
              <img className="block w-[clamp(7.5rem,10.2vw,10.625rem)] max-[600px]:w-[clamp(7.25rem,34vw,9rem)]" src="/images/login%20elements/logo%20title%20white%20navbar.png" alt="La Illustrada Hotel" />
            </Link>
            <nav className="flex min-w-0 flex-1 items-center justify-center gap-[clamp(1rem,3.25vw,3.4375rem)] max-[800px]:gap-[clamp(.65rem,2.5vw,1.125rem)] max-[600px]:hidden" aria-label="Hotel navigation">
              <Link className="whitespace-nowrap font-serif text-[clamp(.875rem,1.15vw,1.0625rem)] text-[#f1dfc6] underline underline-offset-4" to="/">Home</Link>
              <Link className="whitespace-nowrap font-serif text-[clamp(.875rem,1.15vw,1.0625rem)] text-[#f1dfc6]" to="/#rooms">Rooms</Link>
              <Link className="whitespace-nowrap font-serif text-[clamp(.875rem,1.15vw,1.0625rem)] text-[#f1dfc6]" to="/#restaurant">Restaurant</Link>
              <Link className="whitespace-nowrap font-serif text-[clamp(.875rem,1.15vw,1.0625rem)] text-[#f1dfc6]" to="/#contact">Contact Us</Link>
            </nav>
            <Link className="min-w-0 shrink-0 bg-[#c1844c] px-[clamp(.75rem,1.1vw,1.125rem)] py-[clamp(.5rem,.65vw,.625rem)] text-center font-serif text-[clamp(.8125rem,1.15vw,1.0625rem)] text-[#fff8ee] no-underline" to="/rooms">Book Now</Link>
          </div>
        </header>
        <main className="relative flex min-h-[calc(100vh-93px)] w-full justify-center overflow-hidden px-[clamp(1rem,4vw,4rem)] pb-10 pt-[clamp(2.5rem,5.2vw,5.4375rem)] max-[600px]:min-h-[calc(100vh-76px)] max-[600px]:px-4 max-[600px]:pt-10">
          <img className="pointer-events-none absolute right-0 top-0 h-full w-[min(40vw,33.75rem)] object-cover object-left opacity-50 max-[600px]:w-[min(32vw,12rem)]" src="/images/login%20elements/subtle%20art%20right.png" alt="" aria-hidden="true" />
          <ErrorBox message={error} />
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="min-w-0 w-full">
        <header className="sticky top-0 z-20 border-b border-[#7b482d] bg-[#54220e] text-[#f3e1c7] shadow-[0_4px_18px_rgba(55,24,8,.12)]">
          <div className="mx-auto grid min-h-24 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-9 py-[22px] max-[1200px]:gap-4 max-[1200px]:px-7 max-[800px]:grid-cols-[1fr_auto] max-[800px]:gap-[18px] max-[800px]:px-5 max-[500px]:gap-x-2.5 max-[500px]:gap-y-4 max-[500px]:p-4">
            <Link className="flex items-center gap-[11px] whitespace-nowrap font-serif text-[18px] font-bold tracking-wide text-[#f3e1c7] no-underline max-[1200px]:text-[15px] max-[500px]:gap-[7px] max-[500px]:text-xs" to={staff ? '/overview' : '/rooms'}>
              <img className="block w-[clamp(7.5rem,13vw,10.625rem)] max-[500px]:w-[7.25rem]" src="/images/login%20elements/logo%20title%20white%20navbar.png" alt="LA Illustrada Hotel" />
            </Link>
            <nav className="flex gap-1 max-[800px]:col-span-full max-[800px]:row-start-2 max-[800px]:justify-self-center max-[500px]:w-full max-[500px]:max-w-[360px]" aria-label="Booking type">
              <NavLink className={({ isActive }) => `flex items-center justify-center gap-2 whitespace-nowrap border-b-2 px-[19px] py-2.5 text-[13px] font-semibold text-[#e8bd91] transition-colors hover:text-white max-[500px]:flex-1 max-[500px]:px-2.5 max-[500px]:text-xs ${isActive ? 'border-[#d9985d] text-white' : 'border-transparent'}`} to="/rooms">
                <BedDouble size={18} />
                Book a room
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center justify-center gap-2 whitespace-nowrap border-b-2 px-[19px] py-2.5 text-[13px] font-semibold text-[#e8bd91] transition-colors hover:text-white max-[500px]:flex-1 max-[500px]:px-2.5 max-[500px]:text-xs ${isActive ? 'border-[#d9985d] text-white' : 'border-transparent'}`} to="/dining">
                <UtensilsCrossed size={18} />
                Reserve a table
              </NavLink>
            </nav>
            <div className="flex min-w-0 items-center justify-end gap-4 max-[1200px]:gap-2.5 max-[800px]:col-start-2 max-[800px]:row-start-1 max-[500px]:gap-1.5">
              {!staff && (
                <Link className="relative p-2 text-[#f3e1c7] hover:text-white" to="/" title="Hotel home" aria-label="Hotel home">
                  <Home size={18} />
                </Link>
              )}
              {user ? (
                <>
                  <NavLink
                    className="flex items-center gap-[7px] whitespace-nowrap text-xs text-[#f3e1c7] hover:text-white max-[1200px]:[&>span]:sr-only"
                    to="/reservations"
                    title={staff ? 'All reservations' : 'My reservations'}
                  >
                    <ClipboardList size={18} />
                    <span>{staff ? 'All reservations' : 'My reservations'}</span>
                  </NavLink>
                  <NotificationLink />
                  <Link className="flex items-center gap-[7px] whitespace-nowrap text-xs text-[#f3e1c7] hover:text-white max-[500px]:[&>span]:hidden" to="/profile" title="Your profile">
                    <UserRound size={17} />
                    <span>{user.first_name}</span>
                  </Link>
                  <button
                    className="min-h-9 border-0 bg-transparent p-2 text-[#e8bd91] hover:text-white"
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
                <Link className="inline-flex min-h-[34px] items-center justify-center gap-2 border border-[#d9985d] bg-[#b8763c] px-3 py-[7px] text-xs font-semibold leading-[1.35] text-white no-underline transition hover:bg-[#a76530]" to="/login">
                  Sign in <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </div>
          {staff && (
            <nav className="flex flex-wrap justify-center gap-3 border-t border-white/15 px-6 pb-3.5 pt-2 max-[800px]:justify-start max-[800px]:flex-nowrap max-[800px]:gap-1 max-[800px]:overflow-auto max-[800px]:px-4" aria-label="Staff navigation">
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
        <main className="mx-auto w-full max-w-[1280px] px-9 pb-16 pt-10 text-[#54220e] max-[1200px]:p-7 max-[800px]:px-5 max-[800px]:py-[25px] max-[500px]:px-4 max-[500px]:py-[22px] [&_input:not([type=checkbox]):not([type=radio])]:min-h-11 [&_input:not([type=checkbox]):not([type=radio])]:border [&_input:not([type=checkbox]):not([type=radio])]:border-[#b99673] [&_input:not([type=checkbox]):not([type=radio])]:bg-[#fff8ee] [&_input:not([type=checkbox]):not([type=radio])]:text-[#54220e] [&_select]:min-h-11 [&_select]:border [&_select]:border-[#b99673] [&_select]:bg-[#fff8ee] [&_select]:text-[#54220e] [&_textarea]:border [&_textarea]:border-[#b99673] [&_textarea]:bg-[#fff8ee] [&_textarea]:text-[#54220e] [&_button:not([class*='bg-']):not([class*='border-0'])]:min-h-11 [&_button:not([class*='bg-']):not([class*='border-0'])]:rounded-none [&_button:not([class*='bg-']):not([class*='border-0'])]:border [&_button:not([class*='bg-']):not([class*='border-0'])]:border-[#642c14] [&_button:not([class*='bg-']):not([class*='border-0'])]:bg-[#642c14] [&_button:not([class*='bg-']):not([class*='border-0'])]:px-5 [&_button:not([class*='bg-']):not([class*='border-0'])]:py-3 [&_button:not([class*='bg-']):not([class*='border-0'])]:font-serif [&_button:not([class*='bg-']):not([class*='border-0'])]:font-bold [&_button:not([class*='bg-']):not([class*='border-0'])]:text-[#fff8ee] [&_button:not([class*='bg-']):not([class*='border-0'])]:hover:bg-[#54220e] [&_h1]:font-['Gelasio'] [&_h1]:font-normal [&_h1]:text-[#441901] [&_h2]:font-['Gelasio'] [&_h2]:font-normal [&_h2]:text-[#441901]">
          <ErrorBox message={error} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
