import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errorText } from '../../services/api.js';
import { CustomerProfileForm, WorkerProfileForm } from '../../components/profileForms.jsx';

// Edits the existing profile in place (PUT /me/profile updates the same record).
export default function EditProfile() {
  const { t, has } = useI18n();
  const { user, saveProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const submit = async (payload) => {
    try {
      await saveProfile(payload);
      toast.success(t('saved'));
      navigate('/profile');
    } catch (err) {
      toast.error(errorText(err, t, has));
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button type="button" className="btn-ghost -ms-3 mb-3" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('back')}
      </button>
      <h1 className="mb-6 text-2xl font-bold">{t('editProfile')}</h1>
      <div className="card p-5 sm:p-6">
        {user.role === 'worker' ? <WorkerProfileForm user={user} onSubmit={submit} /> : <CustomerProfileForm user={user} onSubmit={submit} />}
      </div>
    </div>
  );
}
