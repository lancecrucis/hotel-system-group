import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './app/providers/Auth';
import { useAuth } from './app/providers/AuthContext';
import { Layout } from './components/layout/Layout';
import { Loading, ErrorBox, Empty } from './components/ui/common';
import { AuthPage } from './features/account-management/pages/AuthPage';
import { Profile } from './features/account-management/pages/Profile';
import { Users } from './features/account-management/pages/Users';
import { Rooms } from './features/hotel-reservations/pages/Rooms';
import { ManageRooms } from './features/hotel-reservations/pages/ManageRooms';
import { Dining } from './features/restaurant-reservations/pages/Dining';
import { RestaurantSettings } from './features/restaurant-reservations/pages/RestaurantSettings';
import { Reservations } from './features/reservation-tracking/pages/Reservations';
import { ReservationDetail } from './features/reservation-tracking/pages/ReservationDetail';
import { Overview } from './features/reservation-tracking/pages/Overview';
import { Notifications } from './features/reservation-tracking/pages/Notifications';
import { Activity } from './features/reservation-tracking/pages/Activity';

function Guard({ staff = false, admin = false }: { staff?: boolean; admin?: boolean }) {
  const { user } = useAuth(),
    location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if ((admin && user.role !== 'admin') || (staff && user.role === 'customer'))
    return (
      <Empty title="Staff access required">
        <Link to="/rooms">Return to booking</Link>
      </Empty>
    );
  return <Outlet />;
}
function Start() {
  const { user } = useAuth();
  return <Navigate to={user && user.role !== 'customer' ? '/overview' : '/rooms'} replace />;
}
function AppRoutes() {
  const { loading, error } = useAuth();
  if (loading)
    return (
      <div className="boot">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="boot">
        <ErrorBox message="API unavailable. Start npm run dev and retry." />
        <button onClick={() => window.location.reload()}>Retry connection</button>
      </div>
    );
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Start />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="dining" element={<Dining />} />
        <Route path="login" element={<AuthPage />} />
        <Route path="register" element={<AuthPage register />} />
        <Route element={<Guard />}>
          <Route path="reservations" element={<Reservations />} />
          <Route path="reservations/:id" element={<ReservationDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route element={<Guard staff />}>
          <Route path="overview" element={<Overview />} />
          <Route path="manage/rooms" element={<ManageRooms />} />
          <Route path="manage/restaurant" element={<RestaurantSettings />} />
          <Route path="activity" element={<Activity />} />
        </Route>
        <Route element={<Guard admin />}>
          <Route path="manage/users" element={<Users />} />
        </Route>
        <Route
          path="*"
          element={
            <Empty title="Page not found">
              <Link to="/">Go home</Link>
            </Empty>
          }
        />
      </Route>
    </Routes>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
