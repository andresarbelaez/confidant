import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Eye, EyeOff } from 'lucide-react';
import './PasswordPrompt.css';

interface PasswordPromptProps {
  userId: string;
  userName: string;
  onVerified: () => void;
  onCancel: () => void;
}

export default function PasswordPrompt({ userId, userName, onVerified, onCancel }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter your password');
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
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify password');
      setPassword('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog password-prompt" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Enter Password</h2>
        </div>
        <div className="modal-content">
          <p className="password-prompt-subtitle">Enter password for {userName}</p>
          
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
                  placeholder="Password"
                  className="form-input"
                  autoFocus
                  disabled={isVerifying}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {error && (
                <div className="form-error">{error}</div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isVerifying || !password.trim()}
              >
                {isVerifying ? 'Verifying...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
