import { useEffect } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  useEffect(() => {
    // Show loading screen for a minimum duration (e.g., 1.5 seconds)
    // This ensures users see the branding even if initialization is fast
    const minDisplayTime = 1500;
    const startTime = Date.now();

    const timer = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      setTimeout(onComplete, remaining);
    }, 100);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <h1 className="loading-title">Confidant</h1>
        <p className="loading-subtitle">Your offline AI assistant</p>
        <p className="loading-tagline">Health answers that stay private</p>
        <div className="loading-spinner"></div>
      </div>
    </div>
  );
}
