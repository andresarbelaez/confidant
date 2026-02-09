import { useTranslation } from '../i18n/hooks/useTranslation';
import './ChatSidebar.css';

interface ChatSidebarProps {
  userId: string;
  onOpenSettings?: () => void;
  onOpenUserSettings?: () => void;
  onLogOut?: () => void;
}

export default function ChatSidebar({ userId, onOpenSettings, onOpenUserSettings, onLogOut }: ChatSidebarProps) {
  const { t } = useTranslation(userId);

  return (
    <div className="chat-sidebar">
      <div className="sidebar-content">
        {onLogOut && (
          <button
            type="button"
            className="sidebar-settings-label"
            onClick={onLogOut}
          >
            {t('ui.logOut')}
          </button>
        )}
        {onOpenUserSettings && (
          <button
            type="button"
            className="sidebar-settings-label"
            onClick={onOpenUserSettings}
          >
            {t('ui.settings')}
          </button>
        )}
      </div>
    </div>
  );
}
