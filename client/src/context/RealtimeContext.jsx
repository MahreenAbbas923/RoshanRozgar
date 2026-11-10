// Socket.IO connection + notifications for the signed-in user.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { tokenStore } from '../services/api.js';
import { notificationsApi } from '../services/index.js';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const { notifText } = useI18n();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [version, setVersion] = useState(0); // bumps when jobs change, so pages can refetch
  const notifTextRef = useRef(notifText);
  notifTextRef.current = notifText;

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const res = await notificationsApi.list().catch(() => null);
    if (res) setNotifications(res.notifications);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setNotifications([]);
      return undefined;
    }
    loadNotifications();
    const s = io({ auth: { token: tokenStore.get() }, transports: ['websocket', 'polling'] });
    s.on('notification', (n) => {
      setNotifications((list) => [n, ...list]);
      toast.info(notifTextRef.current(n), { onClick: () => n.link && navigate(n.link) });
      setVersion((v) => v + 1);
    });
    s.on('job:update', () => {
      setVersion((v) => v + 1);
      refresh().catch(() => {});
    });
    s.on('inbox:update', () => setVersion((v) => v + 1));
    setSocket(s);
    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    await notificationsApi.readAll().catch(() => {});
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback(async (id) => {
    await notificationsApi.read(id).catch(() => {});
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const value = useMemo(
    () => ({ socket, notifications, unread: notifications.filter((n) => !n.read).length, markAllRead, markRead, version, bump: () => setVersion((v) => v + 1) }),
    [socket, notifications, markAllRead, markRead, version],
  );
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
