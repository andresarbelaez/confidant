import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Eye, EyeOff } from 'lucide-react';
import './CreateUserModal.css';

interface CreateUserModalProps {
  onUserCreated: (userId: string) => void;
  onCancel: () => void;
}

export default function CreateUserModal({ onUserCreated, onCancel }: CreateUserModalProps) {
  const [step, setStep] = useState<'name' | 'password'>('name');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (name.trim().length > 50) {
      setError('Name is too long (max 50 characters)');
      return;
    }

    setError(null);
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    setStep('name');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog create-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{step === 'name' ? 'Create Profile' : 'Set Password'}</h2>
        </div>
        <div className="modal-content">
          {step === 'name' ? (
            <form onSubmit={handleNameSubmit}>
              <div className="form-group">
                <label className="form-label">Profile Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your name"
                  className="form-input"
                  autoFocus
                  maxLength={50}
                />
                {error && (
                  <div className="form-error">{error}</div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!name.trim()}
                >
                  Continue
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter password"
                    className="form-input"
                    autoFocus
                    disabled={isCreating}
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
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Confirm password"
                    className="form-input"
                    disabled={isCreating}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                  onClick={handleBack}
                  disabled={isCreating}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating || !password.trim() || !confirmPassword.trim()}
                >
                  {isCreating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
