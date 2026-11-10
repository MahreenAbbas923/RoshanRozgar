import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';
import { HardHat } from '../components/ui.jsx';

export default function NotFound() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <HardHat size={72} />
      <h1 className="text-3xl font-bold">{t('notFoundTitle')}</h1>
      <Link to={user ? homePathFor(user) : '/'} className="btn-primary">
        {t('goHome')}
      </Link>
    </div>
  );
}
