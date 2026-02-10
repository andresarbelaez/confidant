import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import UserProfileCard from './UserProfileCard';
import PasswordPrompt from './PasswordPrompt';
import CreateUserModal from './CreateUserModal';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './UserProfileSelector.css';

interface User {
  id: string;
  name: string;
  created_at: string;
}

interface UserProfileSelectorProps {
  onUserSelected: (userId: string) => void;
  /** When provided, show profiles immediately and skip the loading state (still refresh in background). */
  initialUsers?: User[] | null;
  /** Called when the profile grid has layout and has had time to paint (parent can remove loading overlay). */
  onReady?: () => void;
}

export default function UserProfileSelector({ onUserSelected, initialUsers, onReady }: UserProfileSelectorProps) {
  const { t } = useTranslation(null);
  const [users, setUsers] = useState<User[]>(initialUsers ?? []);
  const [loading, setLoading] = useState(initialUsers == null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyCalledRef = useRef(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // Signal when content has layout (ResizeObserver) + 2 frames; parent keeps overlay for MIN_OVERLAY_MS (WebView compositor)
  useEffect(() => {
    if (loading || !onReady || !containerRef.current) return;
    onReadyCalledRef.current = false;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || entry.contentRect.width === 0) return;
      if (onReadyCalledRef.current) return;
      onReadyCalledRef.current = true;
      observer.disconnect();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => onReady());
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, onReady]);

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

  if (loading) {
    return (
      <div className="user-profile-selector">
        <div className="loading-message">{t('ui.loadingProfiles')}</div>
      </div>
    );
  }

  return (
    <div className="user-profile-selector" ref={containerRef}>
      <div className="selector-header">
        <h1 className="selector-title">{t('ui.whoIsUsing')}</h1>
      </div>
      
      <div className="profiles-grid">
        {users.map((user) => (
          <UserProfileCard
            key={user.id}
            name={user.name}
            onClick={() => handleUserClick(user.id)}
          />
        ))}
        
        <UserProfileCard
          name={t('ui.newUser')}
          isNewUser={true}
          onClick={handleNewUserClick}
        />
      </div>

      {showPasswordPrompt && selectedUserId && (
        <PasswordPrompt
          userId={selectedUserId}
          userName={users.find(u => u.id === selectedUserId)?.name || t('ui.userFallback')}
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

    </div>
  );
}
