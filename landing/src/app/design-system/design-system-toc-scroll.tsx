'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function DesignSystemTocScroll({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || !link.hash) return;
      const id = link.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', link.hash);
      }
    };

    container.addEventListener('click', handleClick);

    if (typeof window !== 'undefined' && window.location.hash) {
      const id = window.location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }

    return () => container.removeEventListener('click', handleClick);
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
