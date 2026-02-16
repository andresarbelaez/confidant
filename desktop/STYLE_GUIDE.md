# Desktop app style guide

Short reference for colors, typography, spacing, and component patterns. Use this to keep UI changes consistent.

## Theme experiments

A warm (cream/yellow) palette can be enabled to match the landing page. It lives in `src/themes/warm.css`.

- **Enable:** Ensure `main.tsx` imports `./themes/warm.css`.
- **Revert:** Comment out that import in `main.tsx`.

## Color variables

Defined in `src/index.css` (`:root` and `@media (prefers-color-scheme: light)`). Prefer variables over hardcoded hex/rgba.

### Brand
- **`--color-primary`** – Primary actions, links, accents. Tuned for WCAG AA (white text on primary ≥ 4.5:1).
- **`--color-primary-hover`** – Hover state for primary controls.

### Surfaces
- **`--color-bg`** – Page/app background.
- **`--color-surface`** – Cards, raised panels.
- **`--color-surface-subtle`** – Very subtle backgrounds (e.g. hover).
- **`--color-surface-input`** – Inputs, secondary buttons.

### Borders
- **`--color-border`** – Default borders.
- **`--color-border-subtle`** – Lighter dividers.

### Text
- **`--color-text`** – Primary body text (high contrast on `--color-bg`).
- **`--color-text-secondary`** – Slightly de-emphasized.
- **`--color-text-muted`** – Secondary copy (still WCAG AA where used as body text).
- **`--color-text-faint`** – Placeholders, hints.

### Semantic
- **`--color-success`**, **`--color-success-bg`**, **`--color-success-text`** – Success states.
- **`--color-error`**, **`--color-error-bg`**, **`--color-error-text`**, **`--color-error-border`** – Errors, validation.
- **`--color-danger-bg`**, **`--color-danger-text`**, **`--color-danger-hover`**, **`--color-danger-active`** – Destructive actions (e.g. Log out).
- **`--color-warning-bg`**, **`--color-warning-text`** – Warnings.
- **`--color-info-bg`**, **`--color-info-border`** – Informational.

### Overlay / modal
- **`--color-overlay`**, **`--color-overlay-strong`** – Backdrops.

### Accessibility
- **`--touch-target-min`** – Minimum size for primary interactive elements (`2.75rem` ≈ 44px). Use for buttons and key controls.

---

## Typography

- **Base:** 1rem (16px), line-height 1.5, font-weight 400. Font stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif.
- **Headings:** Use a clear hierarchy (e.g. one `h1` per view, then `h2` for sections). Heading scale:
  - `h1`: ~3.2em (index.css).
  - Modal/section titles: 1.5em (e.g. `.modal-header h2`).
  - Smaller section labels: 0.95em–1em, font-weight 600.
- Prefer `rem`/`em` for font sizes so scaling stays consistent.

---

## Spacing

Use a small set of spacing values for consistency:

- **0.5rem** – Tight (e.g. between related items, small gaps).
- **0.75rem** – Default padding for inputs, list items, small buttons.
- **1rem** – Standard gap and padding.
- **1.5rem** – Section padding (e.g. modal content, margins above action rows).
- **2rem** – Large gaps, page padding.

Avoid fixed `px` for layout where `rem`/`em` or `%` can be used so scaling and accessibility stay consistent.

---

## Buttons

Shared styles live in `src/components/SharedModal.css` and are used across modals and other views. Global touch-target rules are in `src/index.css`.

### Classes
- **`.btn`** – Base: padding, border-radius 8px, no border. Min size from `--touch-target-min`.
- **`.btn-primary`** – Primary action (e.g. Save, Create). Background: `--color-primary`, text: white.
- **`.btn-secondary`** – Cancel, secondary actions. Background: `--color-surface-input`, text: `--color-text`.
- **`.btn-danger`** – Destructive (e.g. Log out). Uses `--color-danger-*`.

### Usage
- Use `btn btn-primary` or `btn btn-secondary` (and optionally `btn-danger`) on `<button>` elements.
- Ensure padding + content doesn’t shrink the hit area below `--touch-target-min` (already enforced for `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger` in index.css).

---

## Modals

Base structure and layout are in `src/components/SharedModal.css` (imported from `App.tsx`).

### Structure
- **`.modal-overlay`** – Full-screen backdrop (e.g. dim + blur). Click typically closes or is ignored (content uses stopPropagation).
- **`.modal-dialog`** – Centered container: max-width 600px, max-height 90vh, flex column.
- **`.modal-header`** – Title row with border-bottom. Contains `h2` (use a stable `id` for `aria-labelledby`) and optional **`.modal-close`** button.
- **`.modal-content`** – Scrollable body (flex: 1, overflow-y auto).
- **`.modal-actions`** – Footer row for actions: flex, gap 1rem, justify-content flex-end, margin-top 1.5rem.

### Patterns
- Use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` (and `aria-describedby` where helpful).
- Use the `useModalFocusTrap` hook so focus stays inside the dialog and Escape closes.
- Modal-specific layout/skin (e.g. max-width, dark theme overrides) can stay in the modal’s own CSS file (e.g. `SetupModal.css`).

---

## Summary

- **Colors:** Use CSS variables from `index.css`; they switch for `prefers-color-scheme: light`.
- **Type:** Base 1rem, clear heading scale in rem/em.
- **Spacing:** 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem.
- **Buttons:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger` from SharedModal + touch-target in index.
- **Modals:** SharedModal.css for base layout/structure; per-modal CSS only for overrides and specific content.
