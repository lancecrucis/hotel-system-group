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
    <NavLink className="header-icon" to="/notifications" aria-label="Notifications" title="Notifications">
      <Bell size={20} />
      {count > 0 && <span className="count">{count}</span>}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuth(),
    navigate = useNavigate(),
    [error, setError] = useState('');
  const staff = user && user.role !== 'customer';
  return (
    <div className="shell">
      <div className="workspace">
        <header className="site-header">
          <div className="topbar">
            <Link className="brand" to={staff ? '/overview' : '/rooms'}>
              <span className="brand-icon">
                <BedDouble size={24} />
              </span>
              <span>Hotel &amp; Restaurant</span>
            </Link>
            <nav className="booking-toggle" aria-label="Booking type">
              <NavLink to="/rooms">
                <BedDouble size={18} />
                Book a room
              </NavLink>
              <NavLink to="/dining">
                <UtensilsCrossed size={18} />
                Reserve a table
              </NavLink>
            </nav>
            <div className="user-actions">
              {user ? (
                <>
                  <NavLink
                    className="reservations-link"
                    to="/reservations"
                    title={staff ? 'All reservations' : 'My reservations'}
                  >
                    <ClipboardList size={18} />
                    <span>{staff ? 'All reservations' : 'My reservations'}</span>
                  </NavLink>
                  <NotificationLink />
                  <Link className="profile-link" to="/profile" title="Your profile">
                    <UserRound size={17} />
                    <span>{user.first_name}</span>
                  </Link>
                  <button
                    className="icon-button"
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
                <Link className="button secondary small" to="/login">
                  Sign in <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </div>
          {staff && (
            <nav className="management-nav" aria-label="Staff navigation">
              <NavLink to="/overview">
                <LayoutDashboard size={16} />
                Overview
              </NavLink>
              <NavLink to="/manage/rooms">
                <BedDouble size={16} />
                Room inventory
              </NavLink>
              <NavLink to="/manage/restaurant">
                <Settings size={16} />
                Restaurant settings
              </NavLink>
              {user.role === 'admin' && (
                <NavLink to="/manage/users">
                  <Users size={16} />
                  Users &amp; roles
                </NavLink>
              )}
              <NavLink to="/activity">
                <History size={16} />
                Activity log
              </NavLink>
            </nav>
          )}
        </header>
        <main className="page">
          <ErrorBox message={error} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
