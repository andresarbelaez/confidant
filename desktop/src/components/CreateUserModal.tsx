import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import './CreateUserModal.css';

interface CreateUserModalProps {
  onUserCreated: (userId: string) => void;
  onCancel: () => void;
}

export default function CreateUserModal({ onUserCreated, onCancel }: CreateUserModalProps) {
  const { t } = useTranslation(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(true, onCancel, dialogRef);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('errors.pleaseEnterName'));
      return;
    }
    if (name.trim().length > 50) {
      setError(t('errors.nameTooLong'));
      return;
    }
    if (!password.trim()) {
      setError(t('errors.pleaseEnterPasswordField'));
      return;
    }
    if (password.length < 4) {
      setError(t('errors.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('errors.passwordsDoNotMatch'));
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const user = await invoke<{ id: string; name: string; created_at: string }>('create_user', {
        name: name.trim(),
        password,
      });
      onUserCreated(user.id);
    } catch (err) {
      console.error('[CreateUserModal] Failed to create user:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || t('errors.failedToCreateUser'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal-dialog create-user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="create-user-modal-title">{t('ui.createUser')}</h2>
        </div>
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="create-user-name">
                {t('ui.userName')}
              </label>
              <input
                id="create-user-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder={t('ui.enterName')}
                className="form-input form-input--text"
                autoFocus
                maxLength={50}
                disabled={isCreating}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="create-user-password">
                {t('ui.password')}
              </label>
              <div className="password-input-wrapper">
                <input
                  id="create-user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={t('ui.enterPassword')}
                  className="form-input"
                  disabled={isCreating}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('ui.hidePassword') : t('ui.showPassword')}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="create-user-confirm-password">
                {t('ui.confirmPassword')}
              </label>
              <div className="password-input-wrapper">
                <input
                  id="create-user-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={t('ui.confirmPasswordPlaceholder')}
                  className="form-input"
                  disabled={isCreating}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? t('ui.hidePassword') : t('ui.showPassword')}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isCreating}
              >
                {t('ui.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  isCreating ||
                  !name.trim() ||
                  !password.trim() ||
                  !confirmPassword.trim()
                }
              >
                {isCreating ? t('ui.creating') : t('ui.createUserButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
