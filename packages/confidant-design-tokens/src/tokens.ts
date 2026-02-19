/**
 * Confidant design tokens — single source of truth for desktop (and future mobile) UI.
 * Light theme only. Import this for JS/TS, use tokens.css for CSS.
 */

export const tokens = {
  color: {
    primary: "#4f46e5",
    primaryHover: "#4338ca",
    bg: "#ffffff",
    surface: "rgba(0, 0, 0, 0.05)",
    surfaceSubtle: "rgba(0, 0, 0, 0.03)",
    surfaceInput: "#f0f0f0",
    sidebarHover: "rgba(0, 0, 0, 0.05)",
    sidebarSelected: "rgba(0, 0, 0, 0.08)",
    border: "rgba(0, 0, 0, 0.2)",
    borderSubtle: "rgba(0, 0, 0, 0.1)",
    text: "#213547",
    textSecondary: "rgba(0, 0, 0, 0.8)",
    textMuted: "rgba(0, 0, 0, 0.72)",
    textFaint: "rgba(0, 0, 0, 0.6)",
    infoBg: "rgba(59, 130, 246, 0.15)",
    infoBorder: "rgba(59, 130, 246, 0.4)",
    infoText: "#3b82f6",
    success: "#4ade80",
    successBg: "rgba(74, 222, 128, 0.15)",
    successText: "#16a34a",
    error: "#f87171",
    errorBg: "rgba(239, 68, 68, 0.15)",
    errorBorder: "rgba(239, 68, 68, 0.4)",
    errorText: "#dc2626",
    dangerBg: "#b91c1c",
    dangerText: "#ffffff",
    dangerHover: "#991b1b",
    dangerActive: "#7f1d1d",
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayStrong: "rgba(0, 0, 0, 0.7)",
    assistantBubble: "#e8e8e8",
    assistantBubbleText: "rgba(0, 0, 0, 0.88)",
    userBubble: "#2d2d2d",
    userBubbleText: "rgba(255, 255, 255, 0.95)",
    sendButtonBg: "#000000",
    sendButtonIcon: "#ffffff",
    tooltipBg: "#1a1a1a",
    tooltipText: "#ffffff",
    placeholder: "#8e8e8e",
  },
  spacing: {
    touchTargetMin: "2.75rem",
  },
  radius: {
    sm: "8px",
    md: "8px",
  },
  font: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeight: 1.5,
    weightRegular: 400,
    weightMedium: 500,
  },
} as const;

export type ConfidantTokens = typeof tokens;
