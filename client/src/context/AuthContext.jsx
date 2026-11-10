import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, meApi } from '../services/index.js';
import { tokenStore } from '../services/api.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

const AuthContext = createContext(null);
const DEVICE_KEY = 'rr_device_accounts';

// Where a signed-in user belongs: profile setup until done, then their dashboard.
export function homePathFor(user) {
  if (!user) return '/welcome';
  if (!user.profileComplete) return '/onboarding/profile';
  return user.role === 'worker' ? '/worker' : '/customer';
}

// Accounts used on this device. There is no phone number or PIN: the saved
// token is what lets someone come back with one tap after logging out.
function readDeviceAccounts() {
  try {
    const list = JSON.parse(localStorage.getItem(DEVICE_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeDeviceAccounts(list) {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }) {
  const { lang, setLang } = useI18n();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('checking'); // checking | ready
  const [deviceAccounts, setDeviceAccounts] = useState(readDeviceAccounts);

  const remember = useCallback((token, u) => {
    const entry = { id: u.id, token, name: u.name, role: u.role, avatar: u.avatar, avatarSeed: u.avatarSeed, gender: u.gender, isDemo: !!u.isDemo };
    const list = [entry, ...readDeviceAccounts().filter((a) => a.id !== u.id)].slice(0, 6);
    writeDeviceAccounts(list);
    setDeviceAccounts(list);
  }, []);

  // Session verification on load. A server/network hiccup is retried rather
  // than treated as "logged out", so returning users are never sent away.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!tokenStore.get()) {
        setStatus('ready');
        return;
      }
      for (let attempt = 0; attempt < 5 && alive; attempt++) {
        try {
          const { user: me } = await authApi.me();
          if (!alive) return;
          setUser(me);
          if (me.language) setLang(me.language);
          remember(tokenStore.get(), me);
          break;
        } catch (err) {
          if (err.status === 401) {
            tokenStore.set(null);
            break;
          }
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
      if (alive) setStatus('ready');
    })();
    return () => {
      alive = false;
    };
  }, [setLang, remember]);

  const applySession = useCallback(
    ({ token, user: u }) => {
      tokenStore.set(token);
      setUser(u);
      if (u.language) setLang(u.language);
      remember(token, u);
      return u;
    },
    [setLang, remember],
  );

  const signup = useCallback(
    async (role, profile) => applySession(await authApi.signup({ ...profile, role, language: lang })),
    [applySession, lang],
  );
  const demoLogin = useCallback(async (role) => applySession(await authApi.demoLogin(role)), [applySession]);
  const demoLoginAs = useCallback(async (userId) => applySession(await authApi.demoLoginAs(userId)), [applySession]);

  // One tap on a remembered account.
  const continueAs = useCallback(
    async (account) => {
      tokenStore.set(account.token);
      try {
        const { user: me } = await authApi.me();
        return applySession({ token: account.token, user: me });
      } catch (err) {
        tokenStore.set(null);
        if (err.status === 401) {
          const list = readDeviceAccounts().filter((a) => a.id !== account.id);
          writeDeviceAccounts(list);
          setDeviceAccounts(list);
        }
        throw err;
      }
    },
    [applySession],
  );

  const forgetAccount = useCallback((id) => {
    const list = readDeviceAccounts().filter((a) => a.id !== id);
    writeDeviceAccounts(list);
    setDeviceAccounts(list);
  }, []);

  // Logging out ends the session but keeps the account on this device.
  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { user: me } = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const saveProfile = useCallback(
    async (patch) => {
      const res = await meApi.saveProfile(patch);
      setUser(res.user);
      remember(tokenStore.get(), res.user);
      return res;
    },
    [remember],
  );

  const changeLanguage = useCallback(
    async (next) => {
      setLang(next);
      if (user) {
        const res = await meApi.setLanguage(next).catch(() => null);
        if (res?.user) setUser(res.user);
      }
    },
    [setLang, user],
  );

  const value = useMemo(
    () => ({ user, setUser, status, signup, demoLogin, demoLoginAs, continueAs, deviceAccounts, forgetAccount, logout, refresh, saveProfile, changeLanguage }),
    [user, status, signup, demoLogin, demoLoginAs, continueAs, deviceAccounts, forgetAccount, logout, refresh, saveProfile, changeLanguage],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
