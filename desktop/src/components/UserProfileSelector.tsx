import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings } from 'lucide-react';
import UserProfileCard from './UserProfileCard';
import PasswordPrompt from './PasswordPrompt';
import CreateUserModal from './CreateUserModal';
import SetupModal from './SetupModal';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './UserProfileSelector.css';

interface User {
  id: string;
  name: string;
  created_at: string;
}

interface UserProfileSelectorProps {
  onUserSelected: (userId: string) => void;
}

export default function UserProfileSelector({ onUserSelected }: UserProfileSelectorProps) {
  const { t } = useTranslation(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [globalKBReady, setGlobalKBReady] = useState(false);

  useEffect(() => {
    loadUsers();
    checkGlobalKB();
  }, []);

  const checkGlobalKB = async () => {
    try {
      const stats = await invoke<{ document_count: number }>('get_collection_stats_by_name', {
        collectionName: 'dant_knowledge_global'
      });
      setGlobalKBReady(stats.document_count > 0);
    } catch (err) {
      console.error('Failed to check global KB:', err);
    }
  };

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

  const handleGlobalKBReady = () => {
    setGlobalKBReady(true);
  };

  return (
    <div className="user-profile-selector">
      <div className="selector-header">
        <h1 className="selector-title">{t('ui.whoIsUsing')}</h1>
        <button
          className="settings-button"
          onClick={() => setShowSettings(true)}
          title={t('ui.settings')}
        >
          <Settings size={20} />
        </button>
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

      {showSettings && (
        <SetupModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onModelReady={() => {}}
          onKBReady={handleGlobalKBReady}
          title={t('ui.settings')}
          showProceedButton={false}
        />
      )}
    </div>
  );
}
