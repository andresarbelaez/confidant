import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import './PasswordPrompt.css';

interface PasswordPromptProps {
  userId: string;
  userName: string;
  onVerified: () => void;
  onCancel: () => void;
}

export default function PasswordPrompt({ userId, userName, onVerified, onCancel }: PasswordPromptProps) {
  const { t } = useTranslation(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(true, onCancel, dialogRef);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError(t('errors.pleaseEnterPassword'));
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await invoke<boolean>('verify_password', {
        userId,
        password,
      });

      if (isValid) {
        onVerified();
      } else {
        setError(t('errors.incorrectPassword'));
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToVerifyPassword'));
      setPassword('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal-dialog password-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-prompt-title"
        aria-describedby="password-prompt-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="password-prompt-title">{t('ui.enterPasswordTitle')}</h2>
        </div>
        <div className="modal-content">
          <p id="password-prompt-desc" className="password-prompt-subtitle">{t('ui.enterPasswordFor', { name: userName })}</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={t('ui.password')}
                  aria-label={t('ui.password')}
                  className="form-input"
                  autoFocus
                  disabled={isVerifying}
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
              
              {error && (
                <div className="form-error" role="alert">{error}</div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isVerifying}
              >
                {t('ui.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isVerifying || !password.trim()}
              >
                {isVerifying ? t('ui.verifying') : t('ui.signIn')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
