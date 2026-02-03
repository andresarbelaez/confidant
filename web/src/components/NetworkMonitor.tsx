import { useState, useEffect } from 'react';
import './NetworkMonitor.css';

interface NetworkActivity {
  bytesTransmitted: number;
  requestsBlocked: number;
  requestsAllowed: number;
}

export default function NetworkMonitor() {
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

    // Query Service Worker for network activity
    const updateActivity = async () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            if (event.data) {
              setActivity(event.data);
            }
          };

          navigator.serviceWorker.controller?.postMessage(
            { type: 'GET_NETWORK_ACTIVITY' },
            [channel.port2]
          );
        } catch (error) {
          console.error('Failed to get network activity:', error);
        }
      }
    };

    // Update every second
    const interval = setInterval(updateActivity, 1000);
    updateActivity(); // Initial update

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
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
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
      
      <div className="network-stats">
        <div className="stat-item">
          <span className="stat-label">Bytes Transmitted:</span>
          <span className={`stat-value ${activity.bytesTransmitted === 0 ? 'zero' : 'non-zero'}`}>
            {formatBytes(activity.bytesTransmitted)}
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Requests Blocked:</span>
          <span className="stat-value">{activity.requestsBlocked}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Requests Allowed:</span>
          <span className="stat-value">{activity.requestsAllowed}</span>
        </div>
      </div>

      {activity.bytesTransmitted === 0 && (
        <div className="privacy-badge">
          ✓ Zero bytes transmitted - Your queries are private
        </div>
      )}
    </div>
  );
}
