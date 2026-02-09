import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './NetworkMonitor.css';

interface NetworkActivity {
  bytesTransmitted: number;
  requestsBlocked: number;
  requestsAllowed: number;
}

export default function NetworkMonitor() {
  const { t } = useTranslation(null);
  const [activity, setActivity] = useState<NetworkActivity>({
    bytesTransmitted: 0,
    requestsBlocked: 0,
    requestsAllowed: 0,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Desktop app: Network monitoring will be implemented via Tauri backend
    // For now, show that we're in desktop mode (no browser network tracking)
    setActivity({
      bytesTransmitted: 0,
      requestsBlocked: 0,
      requestsAllowed: 0,
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="network-monitor">
      <div className="network-status">
        <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          <span>{isOnline ? t('network.online') : t('network.offline')}</span>
        </div>
      </div>
      
      <div className="network-stats">
        <div className="stat-item">
          <span className="stat-label">{t('network.bytesTransmitted')}</span>
          <span className={`stat-value ${activity.bytesTransmitted === 0 ? 'zero' : 'non-zero'}`}>
            {formatBytes(activity.bytesTransmitted)}
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">{t('network.requestsBlocked')}</span>
          <span className="stat-value">{activity.requestsBlocked}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">{t('network.requestsAllowed')}</span>
          <span className="stat-value">{activity.requestsAllowed}</span>
        </div>
      </div>

      {activity.bytesTransmitted === 0 && (
        <div className="privacy-badge">
          {t('network.zeroBytesPrivacy')}
        </div>
      )}
    </div>
  );
}
