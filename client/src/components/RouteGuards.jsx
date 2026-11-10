import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';
import { PageLoader } from './ui.jsx';

// Signed-in users with a complete profile only. Optional role restriction.
export function RequireAuth({ role, children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'checking') return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.profileComplete) return <Navigate to="/onboarding/profile" replace />;
  if (role && user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return children;
}

// Signed in, profile still being created (one-time step).
export function RequireIncompleteProfile({ children }) {
  const { user, status } = useAuth();
  if (status === 'checking') return <PageLoader />;
  if (!user) return <Navigate to="/welcome" replace />;
  if (user.profileComplete) return <Navigate to={homePathFor(user)} replace />;
  return children;
}

// Pages for signed-out visitors (register / login): returning users skip them.
export function GuestOnly({ children }) {
  const { user, status } = useAuth();
  if (status === 'checking') return <PageLoader />;
  if (user) return <Navigate to={homePathFor(user)} replace />;
  return children;
}
