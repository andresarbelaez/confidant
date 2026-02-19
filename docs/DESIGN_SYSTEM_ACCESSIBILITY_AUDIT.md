# Design System — Accessibility & UX Audit

Audit of the Confidant design system (tokens, shared components, and design-system page) against WCAG 2.1 AA, UI/UX best practices, and the criteria in the audit prompt. Applies to desktop, landing, and future mobile.

---

## 1. Visual Design

### Strengths
- **Single source of truth:** `confidant-design-tokens` (tokens.ts, tokens.css) and `docs/confidant-design-system.md` provide one palette, typography, and spacing scale.
- **Clear hierarchy:** Text tokens (`--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-text-faint`) support visual hierarchy; headings use a defined scale (e.g. h1 2rem, h2 1.5rem) in implementations.
- **Cohesive palette:** Brand (primary/hover), surfaces, borders, semantic (info, success, error, danger, warning), overlay, and chat-specific tokens are grouped and documented.
- **Typography:** System font stack, line-height 1.5, weights 400/500; relative units (rem) used in implementations (e.g. desktop STYLE_GUIDE).

### Gaps & recommendations
- **Contrast (WCAG 2.1 AA):** The spec does not document contrast ratios. Token comments mention “WCAG AA” for primary and touch targets but not for every text/surface pair.
  - **Recommendation:** Add a short “Accessibility” subsection to the design system doc: “Text on background must meet 4.5:1 (normal text) or 3:1 (large text). Semantic pairs (e.g. `--color-text` on `--color-bg`, `--color-primary` with white text) are chosen to meet AA; when introducing new combinations, verify with a contrast checker.”
- **Faint text:** `--color-text-faint` (rgba 0,0,0,0.6) on white may be close to or below 4.5:1 when used as body text.
  - **Recommendation:** Reserve `--color-text-faint` for placeholders and secondary hints; avoid as primary body text. Optionally document “Placeholder/hint only” in the spec and run a contrast check (e.g. WebAIM) for default bg.

---

## 2. Interaction Design

### Strengths
- **Familiar components:** Buttons (primary, secondary, danger), inputs, modals, lists, and sidebar follow common patterns.
- **Consistent CTAs:** Primary vs secondary vs danger is clearly defined; touch-target minimum (2.75rem) is enforced for primary actions.
- **Responsive considerations:** Design-system page uses a responsive sidebar (stacks on narrow viewports); shared sidebar and layout use flexible units.

### Gaps & recommendations
- **Focus states:** The design system doc mentions “Focus and placeholder follow the spec” for form elements but does not define the focus style (e.g. 2px outline, offset, color). Implementations vary (e.g. chat-ui uses `:focus-visible` with `-webkit-focus-ring-color`; some desktop CSS used `outline: none` without a visible replacement—see desktop ACCESSIBILITY_AUDIT).
  - **Recommendation:** Add to the design system spec: “All focusable elements must have a visible focus indicator (e.g. `outline: 2px solid var(--color-primary); outline-offset: 2px` or equivalent). Use `:focus-visible` where appropriate so mouse users don’t get a redundant ring.” Then align all packages (confidant-chat-ui, desktop, landing) with this rule.
- **Animations:** No design-system guidance on motion (prefers-reduced-motion, duration, purpose). Risk of over-animation or ignoring user preference.
  - **Recommendation:** Add a brief “Motion” note: “Respect `prefers-reduced-motion: reduce`; use short, purposeful transitions (e.g. 0.2s) for feedback.”

---

## 3. Accessibility (WCAG)

### Strengths
- **Touch targets (2.5.5):** `--touch-target-min: 2.75rem` (44px) is defined and used for buttons and sidebar items; design system and STYLE_GUIDE reference WCAG.
- **Semantic HTML:** Shared sidebar uses `<nav aria-label>`, buttons use `<button>`, links use `<a href>`. Modals in desktop use `role="dialog"`, `aria-modal`, `aria-labelledby` (per desktop ACCESSIBILITY_AUDIT).
- **Labels:** Form demos use `<label htmlFor>`; ChatInputBar and send button use `aria-label`; decorative icons use `aria-hidden`.
- **Screen reader support:** Copy button uses `aria-label` and tooltip `role="status"`; modals use focus trap and Escape to close.

### Gaps & recommendations
- **Focus visible (2.4.7):** Multiple inputs/controls have had `outline: none` without a visible focus alternative (desktop audit). Design system does not mandate a focus style.
  - **Recommendation:** Define a single focus-indicator pattern in the spec and implement it everywhere (see §2).
- **Design-system page:**
  - **Landmark/headings:** The design-system page uses `<article>` and `<section>` with ids for TOC; ensure a single `<h1>` and logical heading order (h1 → h2 → h3).
  - **TOC links:** Sidebar uses `<a href="#id">`; smooth scroll is implemented. Ensure section `id`s match and that focus moves to the target section for keyboard/screen reader users (e.g. after scroll, move focus to the heading).
  - **Color swatches:** Swatch blocks are decorative (color preview); ensure they are not announced as interactive. Current implementation uses `div` with `style`/`title`; no alt needed for decorative color boxes. Optional: add `aria-hidden` to the swatch block if it’s purely visual.
- **Alternative text:** Sidebar header logo: when `headerLogo` is a string (img src), the package uses `alt=""` (decorative). When it’s a React node (e.g. SVG), ensure the SVG is decorative (`aria-hidden`) or has an accessible name if meaningful.
  - **Recommendation:** Document in the design system: “Decorative images and icons must have `alt=""` or `aria-hidden`; meaningful images must have descriptive alt text.”
- **Keyboard:** Buttons and links are natively focusable. Modal focus trap is implemented in desktop. No skip link on design-system or desktop—acceptable for single-main-view apps but consider a skip link if multiple regions grow.
- **Status messages:** Desktop audit recommends `role="alert"` for chat error and loading; design system can document “Use `role="alert"` for errors that appear dynamically; use `aria-live`/`aria-busy` for loading.”

---

## 4. Performance Optimization

### Strengths
- Tokens and shared components are code-split by app (desktop vs landing); design-system page loads only its demos and shared CSS.
- Design tokens are small (CSS vars + small TS object); no heavy assets in the token package.

### Gaps & recommendations
- Design system doc does not mention performance (e.g. “Prefer CSS for animations; lazy-load non-critical assets”). Optional: add a one-line note under “Documentation” or “Consistency” that implementations should follow performance best practices (e.g. Core Web Vitals, lazy loading for images).

---

## 5. User Feedback

### Strengths
- Buttons have hover states (primary-hover, danger-hover, etc.); form inputs have focus border color; shared chat UI has send-button hover.
- Error/success semantic colors and tokens are defined; desktop uses `role="alert"` for some form errors (per audit).

### Gaps & recommendations
- Design system does not explicitly describe loading states (spinner, skeleton) or error message pattern (e.g. inline vs toast). Optional: add “Loading and error states” to Component Patterns: use `--color-primary` for spinner, `--color-error-*` for errors, and ensure loading/errors are announced (aria-live/role="alert").

---

## 6. Information Architecture

### Strengths
- Design system is organized into Color, Typography, Spacing & Touch Targets, Buttons, Form Elements, Component Patterns; TOC and section ids support in-page navigation.
- Shared sidebar provides consistent navigation pattern; labeling (“Confidant”, “Table of contents”) is clear.

### Gaps & recommendations
- No sitemap or IA diagram in the repo; acceptable for current scope. If the product grows (e.g. multiple apps, many routes), consider a short IA section in the design system or a separate doc.

---

## 7. Mobile-First / Responsive

### Strengths
- Touch target minimum (44px) supports touch; spacing uses rem.
- Design-system page and shared sidebar use responsive layout (sidebar stacks, content reflows); fluid layout and breakpoints are used in landing/desktop.

### Gaps & recommendations
- Design system doc does not state “mobile-first” or breakpoint strategy. STYLE_GUIDE and implementations use rem and flexible layouts; optional: add “Use relative units (rem, em) and touch-friendly targets; test on small viewports.”

---

## 8. Consistency

### Strengths
- Single token package and single spec doc; DESIGN_SYSTEM_ADHERENCE and CONTRIBUTING point contributors to the same source.
- Shared components (ChatSidebarShell, ChatLayout, etc.) ensure the same look and behavior across desktop and design-system page.
- Terminology (primary, secondary, danger, surfaces, etc.) is consistent in the spec and tokens.

### Gaps & recommendations
- Focus style and error/loading patterns are not fully standardized across all apps. Applying the focus and status-message recommendations above will improve consistency.

---

## 9. Documentation

### Strengths
- `docs/confidant-design-system.md` is the human-readable spec; tokens are in code; design-system page provides live demos.
- STYLE_GUIDE (desktop) and DESIGN_SYSTEM_ADHERENCE describe how to use and extend the system; sync and pre-commit keep the doc and landing in sync.

### Gaps & recommendations
- **Accessibility section:** The design system doc has no dedicated “Accessibility” section. Adding a short subsection (contrast, focus, touch targets, semantic HTML, and ARIA) would help.
- **Component usage:** Form and button demos show markup and tokens but do not document ARIA/label requirements (e.g. “Always pair inputs with visible or sr-only labels”). Optional: add one sentence per component pattern (e.g. “Buttons: use native <button>; add aria-label when label is only an icon.”).

---

## 10. Fluid Layouts, Media Queries, Typography, Touch Targets

### Strengths
- **Relative units:** Implementations use rem/em (e.g. font sizes, spacing); tokens use rem for touch-target-min.
- **Layout:** Flexbox and Grid are used in chat-ui and design-system page.
- **Touch targets:** 2.75rem minimum is documented and applied to primary buttons and sidebar items.
- **Typography:** rem-based scale, line-height 1.5, system font stack.

### Gaps & recommendations
- Design system doc does not explicitly say “Use rem/em for font and spacing.” Optional: add under Typography or Spacing: “Use rem (or em) for font sizes and spacing to respect user font-size preferences.”

---

## 11. Images and Media

### Strengths
- Sidebar header supports both image URL and React node (e.g. SVG); img uses `alt=""` when decorative.
- No heavy media in the token or core UI packages.

### Gaps & recommendations
- If the design system or apps add more imagery, document “Use responsive images (srcset/sizes) and lazy loading where appropriate; always provide alt text or mark decorative.”

---

## 12. Forms

### Strengths
- Form tokens (--color-surface-input, --color-border, --color-placeholder) and label/input pattern are documented; demos show label + input with htmlFor/id.
- ChatInputBar uses aria-label for the textarea and send button.

### Gaps & recommendations
- Form demo has both a visible label and `aria-label` on the same input; for clarity, prefer a single source of truth (visible label with htmlFor; omit aria-label when the label is visible). Optional: remove redundant aria-label from the “Label + input” demo and document “Use <label htmlFor> or aria-label, not both when visible.”
- Inline validation and error messaging pattern could be added to the spec (e.g. “Use --color-error-* and role="alert" for field errors”).

---

## 13. Testing

### Strengths
- Desktop ACCESSIBILITY_AUDIT exists and lists fixes (many done). Design system is referenced in STYLE_GUIDE and CONTRIBUTING.

### Gaps & recommendations
- Automated a11y: DESIGN_SYSTEM_ADHERENCE and CONTRIBUTING now recommend running accessibility checks (e.g. axe-core, eslint-plugin-jsx-a11y) in CI or before release.

- **Manual testing:** Test with keyboard (Tab, Enter, Escape, arrows) and with a screen reader (e.g. NVDA, VoiceOver) for critical flows; fix any focus order, labeling, or announcement issues.

---

## Summary: Design system–specific action items

| Priority | Action |
|----------|--------|
| High | Add a short **Accessibility** subsection to `docs/confidant-design-system.md`: contrast (AA), focus visible (single pattern), touch targets (already there), and “semantic HTML + ARIA where needed.” |
| High | Define and document **focus style** (e.g. 2px solid primary, offset 2px; use :focus-visible) and ensure all interactive elements in tokens/chat-ui/desktop/landing follow it. |
| Medium | Add **contrast** note: document that text/background pairs are chosen for AA; reserve text-faint for placeholders. |
| Medium | Design-system page: consider moving focus to the target section after TOC link activation (keyboard/screen reader). |
| Low | Add **Motion** note: respect prefers-reduced-motion; keep transitions short. |
| Low | Optionally document **loading/error** and **form error** patterns (tokens + ARIA) in Component Patterns. |
| Low | Remove redundant aria-label from form demo when a visible label is present; document label vs aria-label in spec. |

---

## References

- **Design system spec:** `docs/confidant-design-system.md`
- **Tokens:** `packages/confidant-design-tokens`
- **Shared UI:** `packages/confidant-chat-ui`
- **Desktop accessibility:** `desktop/ACCESSIBILITY_AUDIT.md`
- **Adherence:** `docs/DESIGN_SYSTEM_ADHERENCE.md`
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
