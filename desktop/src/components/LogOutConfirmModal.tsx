import { useTranslation } from '../i18n/hooks/useTranslation';
import './LogOutConfirmModal.css';

interface LogOutConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  userId?: string | null;
}

export default function LogOutConfirmModal({ onConfirm, onCancel, userId = null }: LogOutConfirmModalProps) {
  const { t } = useTranslation(userId);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog log-out-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('ui.logOutConfirmTitle')}</h2>
        </div>
        <div className="modal-content">
          <p className="log-out-confirm-copy">{t('ui.logOutConfirmCopy')}</p>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              {t('ui.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
            >
              {t('ui.logOut')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
