# Desktop App — Accessibility Audit

WCAG 2.1 Level AA and general legibility review. Last updated: Jan 2026.

---

## Strengths

### Semantic structure
- **Modals**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby` where helpful (CreateUserModal, PasswordPrompt, LogOutConfirmModal, DeleteChatHistoryConfirmModal, SetupModal, UserSettingsModal)
- **Forms**: Labels with `htmlFor` on CreateUserModal, LanguageSelector, SetupModal, SetupSection
- **Navigation**: Sidebar uses `<nav aria-label={t('ui.navAccountAndSettings')}>`
- **Decorative icons**: Lucide icons in sidebar use `aria-hidden`

### Keyboard and focus
- **Modal focus trap**: `useModalFocusTrap` in CreateUserModal, PasswordPrompt, LogOutConfirmModal, DeleteChatHistoryConfirmModal, UserSettingsModal; SetupModal uses it
- **Escape to close**: Modals respond to Escape
- **Tab trapping**: Focus stays inside open modal
- **Focus restore**: Focus returns to trigger element when modal closes

### Touch targets
- `--touch-target-min: 2.75rem` (44px) for primary controls (WCAG 2.5.5)
- Send button, modal actions, sidebar buttons meet minimum size

### Screen reader support
- Chat send: `aria-label={t('ui.send')}`
- Copy message: `aria-label` + `role="status"` on tooltip
- Modal close (SetupModal): `aria-label={t('ui.close')}`
- Form errors: `role="alert"` on CreateUserModal, PasswordPrompt

---

## Issues

### Critical

#### 1. Focus indicator removed (WCAG 2.4.7 — Focus Visible)
Several inputs and controls use `outline: none` on `:focus` with no visible replacement:

| File | Selector | Issue |
|------|----------|-------|
| ChatInterface.css | `.chat-input:focus` | `outline: none` |
| CreateUserModal.css | `.form-input:focus` | `outline: none` |
| PasswordPrompt.css | `.form-input:focus` | `outline: none` |
| SetupScreen.css | `.selector-dropdown:focus` | `outline: none` |
| SetupSection.css | `.selector-dropdown:focus`, `.existing-model-selector:focus` | `outline: none` |
| LanguageSelector.css | `.language-select:focus` | `outline: none` (warm.css adds box-shadow) |

**Recommendation:** Add `:focus-visible` styles: `outline: 2px solid var(--color-primary); outline-offset: 2px` or equivalent. Reserve `outline: none` only for cases where another visible focus style exists.

---

#### 2. Chat input has no accessible name (WCAG 1.3.1, 4.1.2)
The chat textarea relies solely on a placeholder. Placeholders are not sufficient as labels.

```
<textarea placeholder={t('ui.askHealthQuestion')} ... />
```

**Recommendation:** Add `aria-label={t('ui.askHealthQuestion')}` or a visually hidden `<label>` with `htmlFor`.

---

#### 3. Password input has no label (WCAG 1.3.1, 4.1.2)
PasswordPrompt uses a placeholder instead of an associated label. The subtitle explains context but does not provide an accessible name for the input.

**Recommendation:** Add `aria-label={t('ui.password')}` or a visually hidden label.

---

### High

#### 4. Password visibility toggle not keyboard accessible
The show/hide password buttons use `tabIndex={-1}`, so they are skipped in the tab order.

**Location:** CreateUserModal (2 instances), PasswordPrompt

**Recommendation:** Remove `tabIndex={-1}` so the toggle is focusable. Add `aria-label`:
- `aria-label={showPassword ? t('ui.hidePassword') : t('ui.showPassword')}`

---

#### 5. Chat error not announced to screen readers
When an error appears in the chat, it is not announced.

```
{error && <div className="chat-error">{error}</div>}
```

**Recommendation:** Add `role="alert"` so it is announced when it appears.

---

#### 6. Loading spinner not announced
The loading spinner is decorative and has no accessible alternative.

**Recommendation:** Add `aria-live="polite"` region with `aria-busy="true"` on the loading container, or a `sr-only` message such as "Loading…" that updates when loading completes.

---

### Medium

#### 7. Potential color contrast in warm theme
Warm palette uses oklch. Verify contrast ratios:

- **--color-text-muted** (oklch 0.48 0.035 100) on **--color-bg** (0.985 0.008 100) — may be close to 4.5:1
- **--color-text-faint** (0.55) — may fall below 4.5:1 for normal text
- **Assistant bubble** — Very low contrast by design; may not meet 1.4.3 for users with low vision

**Recommendation:** Run a contrast checker on warm theme combinations. Consider bumping `--color-text-muted` and `--color-text-faint` chroma/lightness if needed.

---

#### 8. Document language
`index.html` has `lang="en"` and the app supports multiple languages. When the user switches language, the document `lang` is not updated.

**Recommendation:** Set `document.documentElement.lang` when language changes, or ensure initial load matches user preference.

---

### Low

#### 9. Skip link
No skip-to-content link. For a single-main-view desktop app this may be acceptable, but a skip link can still help keyboard users when multiple regions exist.

---

#### 10. Heading hierarchy
Multiple screens use `h1` or `h2`. Ensure a single `h1` per view and a logical order (h1 → h2 → h3). Error screen uses `h1`; Loading and UserProfileSelector use `h1`-style titles. Verify order when views switch.

---

## Summary checklist

| Criterion | Status |
|----------|--------|
| 1.1.1 Non-text content | Partial — icons have aria-hidden where decorative |
| 1.3.1 Info and relationships | Issues — chat input, password input need labels |
| 1.4.3 Contrast (minimum) | Verify — warm theme, assistant bubble |
| 2.1.1 Keyboard | Pass — modals, forms keyboard accessible |
| 2.4.7 Focus visible | Fail — many focus outlines removed |
| 4.1.2 Name, role, value | Partial — several inputs need accessible names |
| 4.1.3 Status messages | Partial — chat error needs role="alert" |

---

## Recommended fixes (priority order)

1. ~~Add visible focus indicators for all interactive elements (replace `outline: none` with `:focus-visible` styles).~~ **Done**
2. ~~Add `aria-label` or label to chat textarea and PasswordPrompt input.~~ **Done**
3. ~~Make password visibility toggles keyboard accessible and add `aria-label`.~~ **Done**
4. ~~Add `role="alert"` to the chat error container.~~ **Done**
5. Run contrast checks on the warm theme and tweak if needed.
