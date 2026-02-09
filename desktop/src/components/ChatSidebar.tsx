import { LogOut, Settings } from 'lucide-react';
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
    <nav className="chat-sidebar" aria-label={t('ui.navAccountAndSettings')}>
      <div className="sidebar-content">
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
      </div>
    </nav>
  );
}
