import { NavLink, Outlet, Link } from 'react-router-dom';
import { Home, MessageCircle, CalendarCheck, User, Briefcase, Search } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Logo } from '../ui.jsx';
import Avatar from '../Avatar.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import NotificationBell from './NotificationBell.jsx';
import VoiceCommandButton from './VoiceCommandButton.jsx';

function navItems(role) {
  if (role === 'worker') {
    return [
      { to: '/worker', key: 'navHome', icon: Home, end: true },
      { to: '/worker/jobs', key: 'navJobs', icon: Briefcase },
      { mic: true },
      { to: '/chat', key: 'navChat', icon: MessageCircle },
      { to: '/profile', key: 'navProfile', icon: User },
    ];
  }
  return [
    { to: '/customer', key: 'navHome', icon: Home, end: true },
    { to: '/workers', key: 'navFind', icon: Search },
    { to: '/bookings', key: 'navBookings', icon: CalendarCheck },
    { to: '/profile', key: 'navProfile', icon: User },
  ];
}

export default function AppShell() {
  const { t } = useI18n();
  const { user } = useAuth();
  const items = navItems(user?.role);
  const home = user?.role === 'worker' ? '/worker' : '/customer';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        {t('skipToContent')}
      </a>
      <header className="sticky top-0 z-30 border-b border-ink-300/30 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo to={home} size="sm" />
          <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Main">
            {items.map((it, i) =>
              it.mic ? (
                <VoiceCommandButton key={i} className="mx-2 h-12 w-12 ring-0" />
              ) : (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-brand-900 hover:bg-cream-100'
                    }`
                  }
                >
                  <it.icon className="h-4 w-4" aria-hidden />
                  {t(it.key)}
                </NavLink>
              ),
            )}
          </nav>
          <div className="ms-auto flex items-center gap-2 lg:ms-0">
            <LanguageSwitcher />
            <NotificationBell />
            <Link to="/profile" aria-label={t('myProfile')} className="hidden sm:block">
              <Avatar user={user} size={40} />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 lg:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom navigation: big targets with icon + label */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-300/30 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-md items-end justify-around px-2">
          {items.map((it, i) =>
            it.mic ? (
              <li key={i} className="-mt-6">
                <VoiceCommandButton />
              </li>
            ) : (
              <li key={it.to} className="flex-1">
                <NavLink
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? 'text-brand-600' : 'text-ink-500'}`
                  }
                >
                  <it.icon className="h-6 w-6" aria-hidden />
                  {t(it.key)}
                </NavLink>
              </li>
            ),
          )}
        </ul>
      </nav>
    </div>
  );
}
