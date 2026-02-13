# Confidant Landing Page

Marketing landing page for the Confidant desktop app. Built with Next.js, [shadcn/ui](https://ui.shadcn.com), and [Tailark Veil Kit](https://tailark.com) blocks.

## Tech stack

- **Next.js** (App Router) – static export
- **Tailwind CSS v4** – styling
- **shadcn/ui** – Button, Card, and other primitives (New York style)
- **Tailark** – Veil Kit blocks (hero, features, footer) via `@tailark` registry
- **Lucide React** – icons

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

Static output goes to `out/`. Configured for GitHub Pages (copy `out/*` to `docs/`).

## Platform logos (download buttons)

Add `apple-logo.png` and `windows-logo.png` to `landing/public/` for custom icons on the download cards. Requirements:

- **Format:** PNG with transparency (or JPEG)
- **Size:** 48×48px min; 96×96px or 128×128px for retina
- **Display:** Rendered at 40×40px; fallback to emoji if file missing

## Adding components

- **shadcn components:** `npx shadcn add <component>`
- **Tailark blocks:** `npx shadcn add @tailark/<block-name>`

The Tailark registry is configured in `components.json` (`@tailark`). See [Tailark docs](https://tailark.com/docs) for available blocks.

## Deployment

The `.github/workflows/deploy-landing.yml` workflow builds this app and copies `landing/out/*` into `docs/` on pushes to `main` that touch `landing/`. GitHub Pages serves from `docs/`.

To deploy manually:

```bash
npm run build
cp -r out/* ../docs/
```

Then commit and push the `docs/` changes.
