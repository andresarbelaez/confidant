import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import UserProfileCard from './UserProfileCard';
import PasswordPrompt from './PasswordPrompt';
import CreateUserModal from './CreateUserModal';
import './UserProfileSelector.css';

interface User {
  id: string;
  name: string;
  created_at: string;
}

interface UserProfileSelectorProps {
  onUserSelected: (userId: string | null) => void;
}

export default function UserProfileSelector({ onUserSelected }: UserProfileSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showGuestDisclaimer, setShowGuestDisclaimer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const userList = await invoke<User[]>('get_users');
      setUsers(userList || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowPasswordPrompt(true);
  };

  const handleNewUserClick = () => {
    setShowCreateUser(true);
  };

  const handleGuestClick = () => {
    setShowGuestDisclaimer(true);
  };

  const handlePasswordVerified = async () => {
    if (selectedUserId) {
      await invoke('set_current_user', { userId: selectedUserId });
      onUserSelected(selectedUserId);
    }
  };

  const handleUserCreated = async (userId: string) => {
    await loadUsers(); // Refresh user list
    await invoke('set_current_user', { userId });
    onUserSelected(userId);
  };

  const handleGuestConfirmed = async () => {
    await invoke('set_current_user', { userId: null });
    onUserSelected(null);
  };

  if (loading) {
    return (
      <div className="user-profile-selector">
        <div className="loading-message">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="user-profile-selector">
      <h1 className="selector-title">Who's using Confidant?</h1>
      
      <div className="profiles-grid">
        {users.map((user) => (
          <UserProfileCard
            key={user.id}
            name={user.name}
            onClick={() => handleUserClick(user.id)}
          />
        ))}
        
        <UserProfileCard
          name="New User"
          isNewUser={true}
          onClick={handleNewUserClick}
        />
        
        <UserProfileCard
          name="Guest"
          isGuest={true}
          onClick={handleGuestClick}
        />
      </div>

      {showPasswordPrompt && selectedUserId && (
        <PasswordPrompt
          userId={selectedUserId}
          userName={users.find(u => u.id === selectedUserId)?.name || 'User'}
          onVerified={handlePasswordVerified}
          onCancel={() => {
            setShowPasswordPrompt(false);
            setSelectedUserId(null);
          }}
        />
      )}

      {showCreateUser && (
        <CreateUserModal
          onUserCreated={handleUserCreated}
          onCancel={() => setShowCreateUser(false)}
        />
      )}

      {showGuestDisclaimer && (
        <div className="modal-overlay" onClick={() => setShowGuestDisclaimer(false)}>
          <div className="modal-dialog guest-disclaimer" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Guest Mode</h2>
            </div>
            <div className="modal-content">
              <div className="info-note warning">
                <p><strong>Your chats and information will not be saved.</strong></p>
                <p>Switch to a user profile to save your conversation history and settings.</p>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleGuestConfirmed}
                >
                  Continue as Guest
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowGuestDisclaimer(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
