'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatSidebarShell } from 'confidant-chat-ui';
import { ColorSwatches } from './demos/color-swatches';
import { TypographyDemo } from './demos/typography-demo';
import { SpacingDemo } from './demos/spacing-demo';
import { ButtonDemos } from './demos/button-demos';
import { FormElementsDemo } from './demos/form-elements-demo';
import { ComponentPatternsDemo } from './demos/component-patterns-demo';

const TOC_HEADING = 'Table of Contents';

function headingToId(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, '--')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const DEMOS: Record<string, React.ComponentType | null> = {
  'Color Palette': ColorSwatches,
  'Typography': TypographyDemo,
  'Spacing & Touch Targets': SpacingDemo,
  'Buttons': ButtonDemos,
  'Form Elements': FormElementsDemo,
  'Component Patterns': ComponentPatternsDemo,
};

function renderSectionWithInlineDemo(
  section: string,
  Demo: React.ComponentType | null
): React.ReactNode {
  if (!Demo) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{section}</ReactMarkdown>;
  }
  const blocks = section.split(/\n\n/);
  const introEnd = Math.min(2, blocks.length);
  const intro = blocks.slice(0, introEnd).join('\n\n');
  const rest = blocks.slice(introEnd).join('\n\n');
  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
      <Demo />
      {rest ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{rest}</ReactMarkdown>
      ) : null}
    </>
  );
}

export function DesignSystemClientLayout({ content }: { content: string }) {
  const mainRef = useRef<HTMLElement>(null);
  const [activeHref, setActiveHref] = useState<string>('');

  const sections = content.split(/(?=^## )/m).filter(Boolean);
  const tocItems = sections
    .map((section) => {
      const headingMatch = section.match(/^## (.+?)(?:\n|$)/);
      const heading = headingMatch ? headingMatch[1].trim() : '';
      return heading && heading !== TOC_HEADING
        ? { label: heading, href: `#${headingToId(heading)}` }
        : null;
    })
    .filter((x): x is { label: string; href: string } => Boolean(x));

  // Scroll spy: set activeHref from visible section
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const sectionEls = main.querySelectorAll<HTMLElement>('section[id]');
    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Prefer the entry with largest intersection ratio, then first in document order
        const byRatio = [...visible].sort(
          (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
        );
        const id = byRatio[0].target.id;
        if (id) setActiveHref(`#${id}`);
      },
      { root: null, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [content]);

  // Sync activeHref from hash (after mount to avoid hydration mismatch; and on hashchange)
  useEffect(() => {
    setActiveHref(window.location.hash || '');
    const onHash = () => setActiveHref(window.location.hash || '');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Initial hash: scroll to section on load
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    const el = document.getElementById(id);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(
      'a[href^="#"]'
    );
    if (!link?.hash) return;
    const id = link.hash.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', link.hash);
    setActiveHref(link.hash);
    // Move focus to section for keyboard/screen reader after scroll
    requestAnimationFrame(() => {
      setTimeout(() => {
        (el as HTMLElement).focus({ preventScroll: true });
      }, 400);
    });
  }, []);

  return (
    <div className="ds-layout" onClick={handleContainerClick} role="presentation">
      <aside className="ds-sidebar-wrap">
        <ChatSidebarShell
          items={tocItems}
          aria-label="Table of contents"
          headerLogo="/logo-192.png"
          headerLabel="Confidant"
          activeHref={activeHref || undefined}
        />
      </aside>
      <main ref={mainRef} className="ds-main">
        <article className="ds-page">
          {sections.map((section, i) => {
            const headingMatch = section.match(/^## (.+?)(?:\n|$)/);
            const heading = headingMatch ? headingMatch[1].trim() : '';
            if (heading === TOC_HEADING) return null;
            const sectionId = heading ? headingToId(heading) : undefined;
            const demo = heading ? DEMOS[heading] ?? null : null;
            return (
              <section
                key={i}
                id={sectionId}
                tabIndex={sectionId ? -1 : undefined}
              >
                {renderSectionWithInlineDemo(section, demo)}
              </section>
            );
          })}
        </article>
      </main>
    </div>
  );
}
