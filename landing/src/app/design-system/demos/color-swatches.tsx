'use client';

import { tokens } from 'confidant-design-tokens';

type Swatch = { name: string; varName: string; value: string };

/** Relative luminance 0–1 (higher = lighter). Used to sort darkest → lightest. */
function getLuminance(value: string): number {
  const hex = value.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const r = parseInt(hex[1].slice(0, 2), 16) / 255;
    const g = parseInt(hex[1].slice(2, 4), 16) / 255;
    const b = parseInt(hex[1].slice(4, 6), 16) / 255;
    return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
  }
  const rgba = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (rgba) {
    const r = Number(rgba[1]) / 255;
    const g = Number(rgba[2]) / 255;
    const b = Number(rgba[3]) / 255;
    return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
  }
  const oklch = value.match(/^oklch\(\s*([\d.]+)\s+[\d.]+\s+[\d.]+\s*\)$/);
  if (oklch) {
    return Number(oklch[1]);
  }
  return 0.5;
}
function srgbToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function sortByDarkestFirst(swatches: Swatch[]): Swatch[] {
  return [...swatches].sort((a, b) => getLuminance(a.value) - getLuminance(b.value));
}

const GROUPS: Record<string, Swatch[]> = {
  Brand: [
    { name: 'Primary', varName: '--color-primary', value: tokens.color.primary },
    { name: 'Primary hover', varName: '--color-primary-hover', value: tokens.color.primaryHover },
  ],
  Surfaces: [
    { name: 'Background', varName: '--color-bg', value: tokens.color.bg },
    { name: 'Surface', varName: '--color-surface', value: tokens.color.surface },
    { name: 'Surface subtle', varName: '--color-surface-subtle', value: tokens.color.surfaceSubtle },
    { name: 'Surface input', varName: '--color-surface-input', value: tokens.color.surfaceInput },
    { name: 'Sidebar hover', varName: '--color-sidebar-hover', value: tokens.color.sidebarHover },
    { name: 'Sidebar selected', varName: '--color-sidebar-selected', value: tokens.color.sidebarSelected },
  ],
  Borders: [
    { name: 'Border', varName: '--color-border', value: tokens.color.border },
    { name: 'Border subtle', varName: '--color-border-subtle', value: tokens.color.borderSubtle },
  ],
  Text: [
    { name: 'Text', varName: '--color-text', value: tokens.color.text },
    { name: 'Text secondary', varName: '--color-text-secondary', value: tokens.color.textSecondary },
    { name: 'Text muted', varName: '--color-text-muted', value: tokens.color.textMuted },
    { name: 'Text faint', varName: '--color-text-faint', value: tokens.color.textFaint },
  ],
  Info: [
    { name: 'Info text', varName: '--color-info-text', value: tokens.color.infoText },
    { name: 'Info border', varName: '--color-info-border', value: tokens.color.infoBorder },
    { name: 'Info bg', varName: '--color-info-bg', value: tokens.color.infoBg },
  ],
  Success: [
    { name: 'Success text', varName: '--color-success-text', value: tokens.color.successText },
    { name: 'Success', varName: '--color-success', value: tokens.color.success },
    { name: 'Success bg', varName: '--color-success-bg', value: tokens.color.successBg },
  ],
  Error: [
    { name: 'Error text', varName: '--color-error-text', value: tokens.color.errorText },
    { name: 'Error', varName: '--color-error', value: tokens.color.error },
    { name: 'Error border', varName: '--color-error-border', value: tokens.color.errorBorder },
    { name: 'Error bg', varName: '--color-error-bg', value: tokens.color.errorBg },
  ],
  Danger: [
    { name: 'Danger active', varName: '--color-danger-active', value: tokens.color.dangerActive },
    { name: 'Danger hover', varName: '--color-danger-hover', value: tokens.color.dangerHover },
    { name: 'Danger bg', varName: '--color-danger-bg', value: tokens.color.dangerBg },
    { name: 'Danger text', varName: '--color-danger-text', value: tokens.color.dangerText },
  ],
  Overlay: [
    { name: 'Overlay strong', varName: '--color-overlay-strong', value: tokens.color.overlayStrong },
    { name: 'Overlay', varName: '--color-overlay', value: tokens.color.overlay },
  ],
  'Chat-specific': [
    { name: 'Assistant bubble', varName: '--color-assistant-bubble', value: tokens.color.assistantBubble },
    { name: 'Assistant bubble text', varName: '--color-assistant-bubble-text', value: tokens.color.assistantBubbleText },
    { name: 'User bubble', varName: '--color-user-bubble', value: tokens.color.userBubble },
    { name: 'User bubble text', varName: '--color-user-bubble-text', value: tokens.color.userBubbleText },
    { name: 'Send button bg', varName: '--color-send-button-bg', value: tokens.color.sendButtonBg },
    { name: 'Send button icon', varName: '--color-send-button-icon', value: tokens.color.sendButtonIcon },
    { name: 'Tooltip bg', varName: '--color-tooltip-bg', value: tokens.color.tooltipBg },
    { name: 'Tooltip text', varName: '--color-tooltip-text', value: tokens.color.tooltipText },
    { name: 'Placeholder', varName: '--color-placeholder', value: tokens.color.placeholder },
  ],
};

export function ColorSwatches() {
  return (
    <div className="ds-color-demo">
      {Object.entries(GROUPS).map(([groupName, swatches]) => (
        <div key={groupName} className="ds-color-group">
          <h3 className="ds-color-group-title">{groupName}</h3>
          <div className="ds-swatches">
            {sortByDarkestFirst(swatches).map(({ name, varName, value }) => (
              <div key={varName} className="ds-swatch">
                <div
                  className="ds-swatch-block"
                  style={{ background: value }}
                  title={value}
                />
                <div className="ds-swatch-meta">
                  <span className="ds-swatch-name">{name}</span>
                  <code className="ds-swatch-var">{varName}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
