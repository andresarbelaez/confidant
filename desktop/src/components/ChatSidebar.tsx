import { LogOut, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './ChatSidebar.css';

interface ChatSidebarProps {
  userId: string;
  onOpenSettings?: () => void;
  onOpenUserSettings?: () => void;
  onLogOut?: () => void;
  onDeleteChatHistory?: () => void;
}

export default function ChatSidebar({ userId, onOpenSettings, onOpenUserSettings, onLogOut, onDeleteChatHistory }: ChatSidebarProps) {
  const { t } = useTranslation(userId);

  return (
    <nav className="chat-sidebar" aria-label={t('ui.navAccountAndSettings')}>
      <div className="sidebar-content">
        {/* Nav order: existing items first; add new items at the bottom. */}
        {onLogOut && (
          <button
            type="button"
            className="sidebar-settings-label"
            onClick={onLogOut}
          >
            <LogOut className="sidebar-settings-icon" aria-hidden />
            {t('ui.logOut')}
          </button>
        )}
        {onOpenUserSettings && (
          <button
            type="button"
            className="sidebar-settings-label"
            onClick={onOpenUserSettings}
          >
            <Settings className="sidebar-settings-icon" aria-hidden />
            {t('ui.settings')}
          </button>
        )}
        {onDeleteChatHistory && (
          <button
            type="button"
            className="sidebar-settings-label"
            onClick={onDeleteChatHistory}
          >
            <Trash2 className="sidebar-settings-icon" aria-hidden />
            {t('ui.deleteChatHistory')}
          </button>
        )}
      </div>
    </nav>
  );
}
