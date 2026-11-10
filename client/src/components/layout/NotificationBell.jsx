import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';

export default function NotificationBell() {
  const { t, notifText, timeAgo } = useI18n();
  const { notifications, unread, markAllRead, markRead } = useRealtime();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="icon-btn relative"
        aria-label={`${t('navNotifications')}${unread ? ` (${unread})` : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-brand-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-300/30 bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-ink-300/30 px-4 py-3">
            <span className="font-semibold text-brand-900">{t('navNotifications')}</span>
            {unread > 0 && (
              <button type="button" className="text-xs font-semibold text-brand-600" onClick={markAllRead}>
                {t('markAllRead')}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-500">{t('noNotifications')}</li>}
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                    if (n.link) navigate(n.link);
                  }}
                  className={`flex w-full gap-3 px-4 py-3 text-start hover:bg-cream-100 ${n.read ? '' : 'bg-brand-50/60'}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-amber-500'}`} />
                  <span className="flex-1">
                    <span className="block text-sm text-brand-900">{notifText(n)}</span>
                    <span className="text-xs text-ink-500">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
