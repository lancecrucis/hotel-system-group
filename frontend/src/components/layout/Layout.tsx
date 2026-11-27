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
  UserPlus,
  Sparkles,
  BarChart3,
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
      {count > 0 && <span className="absolute -right-0.5 top-0 min-w-[15px] rounded-full bg-[#b08d57] px-1 py-px text-center text-[9px] text-white">{count}</span>}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuth(),
    navigate = useNavigate(),
    location = useLocation(),
    [error, setError] = useState('');
  const staff = user && user.role !== 'customer';
  const admin = user?.role === 'admin';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#f3e1c7] text-[#54220e]">
       <header className="
            sticky top-0 z-20
            h-[clamp(4.5rem,8vw,5.8125rem)]
            bg-[url('/images/login%20elements/new%20new%20navbar%20bg.png')]
            bg-cover bg-center bg-no-repeat
            text-[#f8ead5]
        ">
          <div className="mx-auto flex h-full w-full items-center justify-between gap-4 px-[clamp(.75rem,5vw,14.5rem)] max-[800px]:gap-3 max-[800px]:px-4">
            <Link className="flex w-[clamp(8rem,14vw,14.6875rem)] min-w-0 shrink items-center justify-center no-underline max-[600px]:justify-start" to="/" aria-label="La Illustrada Hotel home">
              <img className="block w-[clamp(7.5rem,10.2vw,10.625rem)] max-[600px]:w-[clamp(7.25rem,34vw,9rem)]" src="/images/login%20elements/logo%20title%20white%20navbar.png" alt="La Illustrada Hotel" />
            </Link>
            <nav className="flex min-w-0 flex-1 items-center justify-center gap-[clamp(.75rem,3.25vw,3.4375rem)] max-[800px]:hidden" aria-label="Hotel navigation">
              <Link className="whitespace-nowrap font-serif text-[clamp(.875rem,1.15vw,1.0625rem)] text-[#f1dfc6] underline underline-offset-4" to="/">Home</Link>
              <Link className="whitespace-nowrap font-serif text-[clamp(.875rem,1.15vw,1.0625rem)] text-[#f1dfc6]" to="/#rooms">Rooms</Link>
              <Link className="whitespace-nowrap font-serif text-[clamp(.875rem,1.15vw,1.0625rem)] text-[#f1dfc6]" to="/#restaurant">Restaurant</Link>
              <Link className="whitespace-nowrap font-serif text-[clamp(.875rem,1.15vw,1.0625rem)] text-[#f1dfc6]" to="/#contact">Contact Us</Link>
            </nav>
            <div className="flex items-center gap-3 max-[800px]:hidden">
              <Link className="shrink-0 whitespace-nowrap bg-[#b08d57] px-[clamp(.625rem,1.1vw,1.125rem)] py-[clamp(.45rem,.65vw,.625rem)] text-center font-serif text-[clamp(.75rem,1.15vw,1.0625rem)] text-[#fff8ee] no-underline hover:bg-[#9a7848]" to="/rooms">Book Now</Link>
              <Link className="shrink-0 whitespace-nowrap font-serif text-[clamp(.75rem,1.1vw,1rem)] font-bold uppercase text-[#f3e1c7] no-underline hover:text-white" to="/login">Login</Link>
              <Link className="shrink-0 whitespace-nowrap font-serif text-[clamp(.75rem,1.1vw,1rem)] font-bold uppercase text-[#f3e1c7] no-underline hover:text-white" to="/register">Sign Up</Link>
            </div>
          </div>
        </header>
        <main className={`relative flex ${isAuthPage ? 'min-h-[calc(100svh-clamp(4.5rem,8vw,5.8125rem))] items-center py-3' : 'min-h-[calc(100vh-93px)] pt-[clamp(2.5rem,5.2vw,5.4375rem)] max-[600px]:min-h-[calc(100vh-76px)] max-[600px]:pt-10'} w-full justify-center overflow-x-hidden overflow-y-auto px-[clamp(1rem,4vw,4rem)] pb-4 max-[600px]:px-4`}>
          <img className="pointer-events-none absolute right-0 top-0 h-full w-[min(40vw,33.75rem)] object-cover object-left opacity-30 max-[600px]:w-[min(32vw,12rem)]" src="/images/login%20elements/subtle%20art%20right.png" alt="" aria-hidden="true" />
          <ErrorBox message={error} />
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="min-w-0 w-full">
        <header className="sticky top-0 z-20 border-b border-[#3a4f6f] bg-[#1e2d4a] text-[#f3e1c7] shadow-[0_4px_18px_rgba(30,45,74,.18)]">
          <div className="mx-auto grid min-h-[76px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-5 px-9 py-3 max-[1200px]:gap-4 max-[1200px]:px-7 max-[800px]:grid-cols-[1fr_auto] max-[800px]:gap-3 max-[800px]:px-5 max-[500px]:gap-x-2.5 max-[500px]:gap-y-2.5 max-[500px]:p-3">
            <div className="flex min-w-0 items-center gap-3 max-[1200px]:gap-2 max-[500px]:gap-1.5">
              <Link className="flex items-center gap-[11px] whitespace-nowrap font-serif text-[18px] font-bold tracking-wide text-[#f3e1c7] no-underline max-[1200px]:text-[15px] max-[500px]:gap-[7px] max-[500px]:text-xs" to={staff ? '/overview' : '/rooms'}>
                <img className="block w-[clamp(7.5rem,13vw,10.625rem)] max-[500px]:w-[7.25rem]" src="/images/login%20elements/logo%20title%20white%20navbar.png" alt="LA Illustrada Hotel" />
              </Link>
            </div>
            {staff ? (
              <span className="justify-self-center font-serif text-sm text-[#e8bd91] max-[800px]:hidden">{admin ? 'Hotel administration' : 'Front desk operations'}</span>
            ) : (
              <nav className="flex gap-1 max-[800px]:col-span-full max-[800px]:row-start-2 max-[800px]:justify-self-center max-[500px]:w-full max-[500px]:max-w-[360px]" aria-label="Booking type">
                <NavLink className={({ isActive }) => `flex items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-[13px] font-semibold text-[#e8bd91] transition-colors hover:text-white max-[500px]:flex-1 max-[500px]:px-2.5 max-[500px]:text-xs ${isActive ? 'border-[#b08d57] text-white' : 'border-transparent'}`} to="/rooms">
                  <BedDouble size={18} aria-hidden="true" />
                  Book a room
                </NavLink>
                <NavLink className={({ isActive }) => `flex items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-[13px] font-semibold text-[#e8bd91] transition-colors hover:text-white max-[500px]:flex-1 max-[500px]:px-2.5 max-[500px]:text-xs ${isActive ? 'border-[#b08d57] text-white' : 'border-transparent'}`} to="/dining">
                  <UtensilsCrossed size={18} aria-hidden="true" />
                  Reserve a table
                </NavLink>
              </nav>
            )}
            <div className="flex min-w-0 items-center justify-end gap-4 max-[1200px]:gap-2.5 max-[800px]:col-start-2 max-[800px]:row-start-1 max-[500px]:gap-1.5">
              {!user && (
                <>
                  <Link className="inline-flex min-h-[34px] shrink-0 items-center justify-center whitespace-nowrap border border-[#b08d57] bg-[#b08d57] px-3 py-[7px] text-xs font-semibold leading-[1.35] text-white no-underline transition hover:bg-[#9a7848] max-[1000px]:hidden" to="/rooms">
                    Book Now
                  </Link>
                  <Link className="inline-flex min-h-[34px] shrink-0 items-center justify-center whitespace-nowrap border border-[#b08d57] bg-transparent px-3 py-[7px] text-xs font-semibold leading-[1.35] text-[#f3e1c7] no-underline transition hover:bg-[#b08d57] hover:text-white max-[1000px]:hidden" to="/login">
                    Login
                  </Link>
                  <Link className="inline-flex min-h-[34px] shrink-0 items-center justify-center whitespace-nowrap border border-[#b08d57] bg-transparent px-3 py-[7px] text-xs font-semibold leading-[1.35] text-[#f3e1c7] no-underline transition hover:bg-[#b08d57] hover:text-white max-[1000px]:hidden" to="/register">
                    Sign Up
                  </Link>
                </>
              )}
              {user ? (
                <>
                  <NavLink
                    className="flex items-center gap-[7px] whitespace-nowrap text-xs text-[#f3e1c7] hover:text-white max-[1200px]:[&>span]:sr-only"
                    to="/reservations"
                    title={staff ? 'Reservations' : 'My reservations'}
                  >
                    <ClipboardList size={18} />
                    <span>{staff ? 'Reservations' : 'My reservations'}</span>
                  </NavLink>
                  <NotificationLink />
                  {!staff && (
                    <Link className="flex items-center gap-[7px] whitespace-nowrap text-xs text-[#f3e1c7] hover:text-white max-[500px]:[&>span]:hidden" to="/profile" title="Your profile">
                      {user.profile_image ? (
                        <img
                          className="h-7 w-7 rounded-full border border-[#b08d57] object-cover"
                          src={user.profile_image}
                          alt=""
                   />
                    ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#b08d57] text-xs">
                      {user.first_name.charAt(0).toUpperCase()}
                        </div>
                  )}
                      <span>{user.first_name}</span>
                    </Link>
                  )}
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
              )}
            </div>
          </div>
          {staff && (
            <nav className="flex flex-wrap justify-center gap-3 border-t border-white/15 px-6 pb-3.5 pt-2 max-[800px]:justify-start max-[800px]:flex-nowrap max-[800px]:gap-1 max-[800px]:overflow-auto max-[800px]:px-4" aria-label="Staff navigation">
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] whitespace-nowrap px-3 py-2 text-xs text-[#e8bd91] hover:text-white ${isActive ? 'bg-[#2a3f5f] text-white' : ''}`} to="/overview">
                <LayoutDashboard size={16} />
                Operations dashboard
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] whitespace-nowrap px-3 py-2 text-xs text-[#e8bd91] hover:text-white ${isActive ? 'bg-[#2a3f5f] text-white' : ''}`} to="/walk-in">
                <UserPlus size={16} />
                Walk-in booking
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] whitespace-nowrap px-3 py-2 text-xs text-[#e8bd91] hover:text-white ${isActive ? 'bg-[#2a3f5f] text-white' : ''}`} to="/manage/rooms">
                <BedDouble size={16} />
                Room inventory
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] whitespace-nowrap px-3 py-2 text-xs text-[#e8bd91] hover:text-white ${isActive ? 'bg-[#2a3f5f] text-white' : ''}`} to="/housekeeping">
                <Sparkles size={16} />
                Housekeeping
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] whitespace-nowrap px-3 py-2 text-xs text-[#e8bd91] hover:text-white ${isActive ? 'bg-[#2a3f5f] text-white' : ''}`} to="/manage/restaurant">
                <Settings size={16} />
                Dining operations
              </NavLink>
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] whitespace-nowrap px-3 py-2 text-xs text-[#e8bd91] hover:text-white ${isActive ? 'bg-[#2a3f5f] text-white' : ''}`} to="/reports">
                <BarChart3 size={16} />
                Reports
              </NavLink>
              {user.role === 'admin' && (
                <NavLink className={({ isActive }) => `flex items-center gap-[7px] whitespace-nowrap px-3 py-2 text-xs text-[#e8bd91] hover:text-white ${isActive ? 'bg-[#2a3f5f] text-white' : ''}`} to="/manage/users">
                  <Users size={16} />
                  Team access
                </NavLink>
              )}
              <NavLink className={({ isActive }) => `flex items-center gap-[7px] whitespace-nowrap px-3 py-2 text-xs text-[#e8bd91] hover:text-white ${isActive ? 'bg-[#2a3f5f] text-white' : ''}`} to="/activity">
                <History size={16} />
                Activity log
              </NavLink>
            </nav>
          )}
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-9 pb-16 pt-10 text-[#54220e] max-[1200px]:p-7 max-[800px]:px-5 max-[800px]:py-[25px] max-[500px]:px-4 max-[500px]:py-[22px] [&_label:not([class*='flex-row'])]:flex [&_label:not([class*='flex-row'])]:flex-col [&_label:not([class*='flex-row'])]:gap-1.5 [&_input:not([type=checkbox]):not([type=radio])]:min-h-11 [&_input:not([type=checkbox]):not([type=radio])]:w-full [&_input:not([type=checkbox]):not([type=radio])]:min-w-0 [&_input:not([type=checkbox]):not([type=radio])]:border [&_input:not([type=checkbox]):not([type=radio])]:border-[#b99673] [&_input:not([type=checkbox]):not([type=radio])]:bg-[#fff8ee] [&_input:not([type=checkbox]):not([type=radio])]:px-3 [&_input:not([type=checkbox]):not([type=radio])]:py-2 [&_input:not([type=checkbox]):not([type=radio])]:text-[#54220e] [&_input:not([type=checkbox]):not([type=radio])]:focus-visible:outline-2 [&_input:not([type=checkbox]):not([type=radio])]:focus-visible:outline-offset-2 [&_input:not([type=checkbox]):not([type=radio])]:focus-visible:outline-[#8b4d28] [&_select]:min-h-11 [&_select]:w-full [&_select]:min-w-0 [&_select]:border [&_select]:border-[#b99673] [&_select]:bg-[#fff8ee] [&_select]:px-3 [&_select]:py-2 [&_select]:text-[#54220e] [&_select]:focus-visible:outline-2 [&_select]:focus-visible:outline-[#8b4d28] [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:resize-y [&_textarea]:border [&_textarea]:border-[#b99673] [&_textarea]:bg-[#fff8ee] [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-[#54220e] [&_textarea]:focus-visible:outline-2 [&_textarea]:focus-visible:outline-[#8b4d28] [&_button:not([class*='bg-']):not([class*='border-0'])]:min-h-11 [&_button:not([class*='bg-']):not([class*='border-0'])]:rounded-none [&_button:not([class*='bg-']):not([class*='border-0'])]:border [&_button:not([class*='bg-']):not([class*='border-0'])]:border-[#642c14] [&_button:not([class*='bg-']):not([class*='border-0'])]:bg-[#642c14] [&_button:not([class*='bg-']):not([class*='border-0'])]:px-5 [&_button:not([class*='bg-']):not([class*='border-0'])]:py-3 [&_button:not([class*='bg-']):not([class*='border-0'])]:font-serif [&_button:not([class*='bg-']):not([class*='border-0'])]:font-bold [&_button:not([class*='bg-']):not([class*='border-0'])]:text-[#fff8ee] [&_button:not([class*='bg-']):not([class*='border-0'])]:hover:bg-[#54220e] [&_h1]:font-['Gelasio'] [&_h1]:font-normal [&_h1]:text-[#441901] [&_h2]:font-['Gelasio'] [&_h2]:font-normal [&_h2]:text-[#441901]">
          <ErrorBox message={error} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
