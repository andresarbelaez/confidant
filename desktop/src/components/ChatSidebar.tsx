import { useTranslation } from '../i18n/hooks/useTranslation';
import './ChatSidebar.css';

interface ChatSidebarProps {
  userId: string;
  onOpenSettings?: () => void;
}

export default function ChatSidebar({ userId, onOpenSettings }: ChatSidebarProps) {
  const { t } = useTranslation(userId);

  return (
    <div className="chat-sidebar">
      <div className="sidebar-content">
        {onOpenSettings && (
          <button
            type="button"
            className="sidebar-settings-label"
            onClick={onOpenSettings}
          >
            {t('ui.settings')}
          </button>
        )}
        
        <div className="sidebar-divider" />
        
        <div className="sidebar-section">
          <div className="sidebar-section-label">{t('ui.chatHistory')}</div>
          <div className="chat-history-list">
            {/* Currently showing single chat history for the user */}
            <div className="chat-history-item active">
              {t('ui.currentChat')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
