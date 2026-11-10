import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const STYLES = {
  success: 'bg-brand-900 text-white',
  error: 'bg-red-700 text-white',
  info: 'bg-white text-brand-900 border border-ink-300/40',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message, type = 'info', { onClick } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-2), { id, message, type, onClick }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({ show, success: (m, o) => show(m, 'success', o), error: (m, o) => show(m, 'error', o), info: (m, o) => show(m, 'info', o) }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-md animate-fadeUp items-start gap-3 rounded-2xl px-4 py-3 shadow-lift ${STYLES[toast.type]}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <button
                type="button"
                className="flex-1 text-start text-sm font-medium"
                onClick={() => {
                  toast.onClick?.();
                  dismiss(toast.id);
                }}
              >
                {toast.message}
              </button>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Close" className="opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
