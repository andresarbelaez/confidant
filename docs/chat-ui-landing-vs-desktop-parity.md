# Landing vs desktop chat UI – parity checklist

Both use the shared `confidant-chat-ui` package. Differences come from theme variables and overrides.

## Discrepancies and resolutions

### 1. Send button color
- **Landing:** Blue (`--color-send-button-bg: var(--primary)` → #4338ca).
- **Desktop:** Dark purple/black (warm theme: `var(--color-user-bubble)`; default: `#000000`).
- **Fix:** Desktop (and warm theme) should use primary for the send button so it matches the landing blue.  
  → Set in desktop: `--color-send-button-bg: var(--color-primary)` (and same in warm theme light media query).

### 2. Sidebar background
- **Landing:** White (`#fff` from shared package / preview theme).
- **Desktop:** Light beige in warm theme (`oklch(0.98 0.008 100)` in `warm.css`).
- **Fix:** For parity, desktop sidebar can be white. In `desktop/src/themes/warm.css`, under the light `@media` block, set `.chat-sidebar { background: #fff !important; }` (or remove the override so `ChatSidebar.css`’s `#fff` applies if warm theme no longer overrides it).

### 3. Main / messages area background
- **Landing:** Off‑white/beige from `--background` (e.g. warm-50).
- **Desktop:** Warm theme uses `oklch(0.985 0.008 100)`. Very close; optional to align exact values if you want pixel‑perfect match.

### 4. Welcome vs first message
- **Landing:** Always shows centered “Welcome to Confidant” + subtitle about preview not being private.
- **Desktop:** After load, shows the first AI message (“I’m Confidant. I’m here to support…”) left‑aligned in a bubble. Empty state uses “Welcome to Confidant” + “Finish setup to start.”
- **Fix:** Content difference is intentional (preview vs real app). For layout parity, both use the same `.chat-welcome` from the package (centered, blue title). No change required unless you want the desktop empty-state subtitle to match the landing copy when setup is complete.

### 5. Input wrap border
- Both use `--color-chat-input-wrap-border`; landing ties it to `--border`, desktop to a grey/oklch. Slight tint possible; optional to share the same variable value for exact match.

### 6. Sidebar hover state
- **Landing:** Hover uses `rgba(0, 0, 0, 0.08)` (package).
- **Desktop (warm):** Hover uses `oklch(0.92 0.018 100)`. Slightly different feel; optional to align to same as landing for consistency.

---

## Implemented in code (this session)

- **Send button:** Reverted to dark; both use dark send button.
- **Sidebar:** Desktop warm theme sidebar background set to white to match landing.
- **Sidebar hover:** Landing preview uses warm fill (`var(--warm-200)`) to match desktop.
- **Input fill:** Landing preview input wrap uses white to match desktop.
- **`--color-chat-surface`:** Reusable variable for the “elevated” white used by the text input area and sidebar. Set once per theme (landing `.confidant-chat-preview-theme`, desktop `index.css`, desktop `warm.css`); both `--color-chat-input-wrap-bg` and the sidebar background use it. Change this variable to restyle both input fill and sidebar fill together.
