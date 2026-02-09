import { useRef } from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import './LogOutConfirmModal.css';

interface LogOutConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  userId?: string | null;
}

export default function LogOutConfirmModal({ onConfirm, onCancel, userId = null }: LogOutConfirmModalProps) {
  const { t } = useTranslation(userId);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(true, onCancel, dialogRef);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal-dialog log-out-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-out-confirm-title"
        aria-describedby="log-out-confirm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="log-out-confirm-title">{t('ui.logOutConfirmTitle')}</h2>
        </div>
        <div className="modal-content">
          <p id="log-out-confirm-desc" className="log-out-confirm-copy">{t('ui.logOutConfirmCopy')}</p>
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
