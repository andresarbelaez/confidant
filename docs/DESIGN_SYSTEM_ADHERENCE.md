# Design system adherence

How to keep desktop (and future mobile) UI consistent with the Confidant design system.

## Single source of truth

- **Spec:** [docs/confidant-design-system.md](./confidant-design-system.md) — human-readable palette, typography, spacing, buttons, forms, patterns.
- **Tokens:** `packages/confidant-design-tokens` — `tokens.ts` and `tokens.css` are the programmatic source. Confidant has one theme (light, beige/cream). Use these tokens in code. Desktop applies them via `index.css` and the theme stylesheet in `src/themes/`; do not redefine colors or spacing in app-specific files.
- **Live reference:** The design-system page (e.g. confidant.one/design-system) shows the current tokens and demos. Check it when adding or changing UI.

## Rules for new or changed UI

1. **Colors**  
   Use CSS variables from the design tokens (`--color-*`). Desktop gets them via `index.css` and the theme stylesheet; mobile and landing should import `confidant-design-tokens` and use the same variable names. Avoid new hardcoded hex/rgba except in the tokens package.

2. **Typography**  
   Use the token font stack, line-height, and weights. Prefer `rem`/`em` for font sizes.

3. **Spacing and touch targets**  
   Use the spacing scale (e.g. 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem) and respect `--touch-target-min` for primary interactive elements.

4. **Components**  
   Buttons, form elements, and modals should follow the patterns in the design system (e.g. `.btn`, `.btn-primary`, modal structure). Reuse shared CSS (e.g. desktop `SharedModal.css`) rather than redefining.

5. **When you extend the system**  
   If you need a new token (e.g. a new semantic color), add it to `confidant-design-tokens` and document it in `docs/confidant-design-system.md`, then run the design-system sync if you changed the doc (or rely on the pre-commit hook).

## Checking adherence

- **Desktop:** See [desktop/STYLE_GUIDE.md](../desktop/STYLE_GUIDE.md) for a short reference; it points to this design system.
- **Lint (optional):** From repo root you can run `npm run check:design-tokens` (if configured) to scan for hardcoded colors in desktop/landing and suggest using `var(--color-*)` instead. This is a soft check to catch drift.
- **Accessibility:** Run accessibility checks (e.g. [axe-core](https://github.com/dequelabs/axe-core) or `eslint-plugin-jsx-a11y`) in CI or before release where possible.

## Sync automation

When you edit `docs/confidant-design-system.md`:

- **While developing:** Run `npm run sync:watch` from the `landing` directory so the design-system page stays in sync as you save.
- **On commit (if using git):** From the repo root, run `npm install` once to install husky. Then, whenever you stage `docs/confidant-design-system.md`, the pre-commit hook will run the sync and stage `landing/src/content/design-system.md`, so one commit can update both the spec and the live page. If you don’t use the hook, run `npm run sync:design-system` from `landing` before committing changes to the design system doc.
