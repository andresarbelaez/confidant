import { useRef } from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import './DeleteChatHistoryConfirmModal.css';

interface DeleteChatHistoryConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  userId?: string | null;
}

export default function DeleteChatHistoryConfirmModal({
  onConfirm,
  onCancel,
  userId = null,
}: DeleteChatHistoryConfirmModalProps) {
  const { t } = useTranslation(userId);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(true, onCancel, dialogRef);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal-dialog delete-chat-history-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-chat-history-confirm-title"
        aria-describedby="delete-chat-history-confirm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="delete-chat-history-confirm-title">
            {t('ui.deleteChatHistoryConfirmTitle')}
          </h2>
        </div>
        <div className="modal-content">
          <p
            id="delete-chat-history-confirm-desc"
            className="delete-chat-history-confirm-copy"
          >
            {t('ui.deleteChatHistoryConfirmCopy')}
          </p>
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
              {t('ui.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
