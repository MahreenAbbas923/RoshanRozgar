import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Mic, Image as ImageIcon, BadgeDollarSign } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { chatApi } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import Avatar from '../../components/Avatar.jsx';
import { EmptyState, ErrorState, PageLoader, ProposalStatusBadge } from '../../components/ui.jsx';

export function MessagePreview({ m }) {
  const { t, price, sysMessage } = useI18n();
  if (!m) return null;
  if (m.type === 'voice')
    return (
      <span className="inline-flex items-center gap-1">
        <Mic className="h-3.5 w-3.5" /> {m.transcript ? `“${m.transcript}”` : t('voiceDescription')}
      </span>
    );
  if (m.type === 'image')
    return (
      <span className="inline-flex items-center gap-1">
        <ImageIcon className="h-3.5 w-3.5" /> {t('sendPhoto')}
      </span>
    );
  if (m.type === 'price_offer')
    return (
      <span className="inline-flex items-center gap-1">
        <BadgeDollarSign className="h-3.5 w-3.5" /> {t('priceOffer')}: {price(m.amount)}
      </span>
    );
  if (m.type === 'system') return <span>{sysMessage(m.systemKey, m.systemParams)}</span>;
  return <span dir="auto">{m.text}</span>;
}

export default function Inbox() {
  const { t, has, timeAgo } = useI18n();
  const { user } = useAuth();
  const { version } = useRealtime();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setList((await chatApi.list()).conversations);
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [t, has]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!list) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">{t('conversations')}</h1>
      {list.length === 0 ? (
        <EmptyState icon={MessageCircle} title={t('noConversations')} />
      ) : (
        <ul className="card divide-y divide-ink-300/30 overflow-hidden">
          {list.map((c) => {
            const other = user.role === 'customer' ? c.worker : c.customer;
            return (
              <li key={c.id}>
                <Link to={`/chat/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cream-50">
                  <Avatar user={other} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-brand-900">{other?.name}</p>
                      <ProposalStatusBadge status={c.status} />
                    </div>
                    <p className="truncate text-xs font-medium text-brand-600">{c.job?.title}</p>
                    <p className={`truncate text-sm ${c.unread ? 'font-semibold text-ink-900' : 'text-ink-500'}`}>
                      <MessagePreview m={c.lastMessage} />
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-ink-500">{c.lastMessage && timeAgo(c.lastMessage.createdAt)}</span>
                    {c.unread > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-brand-950">{c.unread}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
