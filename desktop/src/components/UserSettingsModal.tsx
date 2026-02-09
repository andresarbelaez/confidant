import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { getCurrentLanguage } from '../i18n';
import type { LanguageCode } from '../i18n';
import LanguageSelector from './LanguageSelector';
import './UserSettingsModal.css';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UserSettingsModal({ isOpen, onClose, userId }: UserSettingsModalProps) {
  const { t, setLanguage } = useTranslation(userId);
  const [userName, setUserName] = useState<string>('');
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode>(getCurrentLanguage());

  useEffect(() => {
    if (!isOpen || !userId) return;
    const load = async () => {
      try {
        const users = await invoke<Array<{ id: string; name: string }>>('get_users');
        const user = users.find((u) => u.id === userId);
        setUserName(user?.name ?? '');
      } catch (err) {
        console.error('Failed to load user name:', err);
      }
    };
    load();
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      setPendingLanguage(getCurrentLanguage());
    }
  }, [isOpen]);

  const handleSave = async () => {
    await setLanguage(pendingLanguage);
    onClose();
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog user-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="user-settings-modal-title">{t('ui.settingsFor', { name: userName || t('ui.userFallback') })}</h2>
        </div>
        <div className="modal-content">
          <div className="user-settings-section">
            <LanguageSelector userId={userId} value={pendingLanguage} onChange={setPendingLanguage} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('ui.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              {t('ui.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
