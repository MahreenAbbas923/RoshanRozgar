import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import { RequireAuth, RequireIncompleteProfile, GuestOnly } from './components/RouteGuards.jsx';
import { PageLoader } from './components/ui.jsx';
import Splash from './pages/onboarding/Splash.jsx';
import LanguageSelect from './pages/onboarding/LanguageSelect.jsx';
import RoleSelect from './pages/onboarding/RoleSelect.jsx';
import Signup from './pages/onboarding/Signup.jsx';
import Login from './pages/onboarding/Login.jsx';
import ProfileSetup from './pages/onboarding/ProfileSetup.jsx';
import NotFound from './pages/NotFound.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard.jsx'));
const NewJob = lazy(() => import('./pages/customer/NewJob.jsx'));
const FindWorkers = lazy(() => import('./pages/customer/FindWorkers.jsx'));
const MyBookings = lazy(() => import('./pages/customer/MyBookings.jsx'));
const WorkerProfile = lazy(() => import('./pages/WorkerProfile.jsx'));
const UserProfile = lazy(() => import('./pages/UserProfile.jsx'));
const JobDetail = lazy(() => import('./pages/JobDetail.jsx'));
const ReviewPage = lazy(() => import('./pages/ReviewPage.jsx'));
const WorkerDashboard = lazy(() => import('./pages/worker/WorkerDashboard.jsx'));
const WorkerJobs = lazy(() => import('./pages/worker/WorkerJobs.jsx'));
const Inbox = lazy(() => import('./pages/chat/Inbox.jsx'));
const ChatRoom = lazy(() => import('./pages/chat/ChatRoom.jsx'));
const MyProfile = lazy(() => import('./pages/profile/MyProfile.jsx'));
const EditProfile = lazy(() => import('./pages/profile/EditProfile.jsx'));
const Settings = lazy(() => import('./pages/profile/Settings.jsx'));

const customer = (el) => <RequireAuth role="customer">{el}</RequireAuth>;
const worker = (el) => <RequireAuth role="worker">{el}</RequireAuth>;
const anyUser = (el) => <RequireAuth>{el}</RequireAuth>;

// Old links (/register?role=...) go to the one-step sign-up.
function RegisterRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/signup${search}`} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/language" element={<LanguageSelect />} />
        <Route path="/welcome" element={<GuestOnly><RoleSelect /></GuestOnly>} />
        <Route path="/about" element={<Landing />} />
        <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="/register" element={<RegisterRedirect />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/onboarding/profile" element={<RequireIncompleteProfile><ProfileSetup /></RequireIncompleteProfile>} />

        <Route element={anyUser(<AppShell />)}>
          <Route path="/customer" element={customer(<CustomerDashboard />)} />
          <Route path="/jobs/new" element={customer(<NewJob />)} />
          <Route path="/jobs/:id/workers" element={customer(<FindWorkers />)} />
          <Route path="/workers" element={customer(<FindWorkers />)} />
          <Route path="/workers/:id" element={<WorkerProfile />} />
          <Route path="/bookings" element={customer(<MyBookings />)} />

          <Route path="/worker" element={worker(<WorkerDashboard />)} />
          <Route path="/worker/jobs" element={worker(<WorkerJobs />)} />

          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/jobs/:id/review" element={<ReviewPage />} />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route path="/chat" element={<Inbox />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
