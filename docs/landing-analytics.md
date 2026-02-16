# Landing page analytics

The Confidant landing ([confidant.one](https://confidant.one)) supports **privacy-friendly** analytics: no cookies, minimal data, aligned with the product’s privacy stance.

## Supported providers

| Provider | Page views | Geography | Download events | Cost |
|----------|------------|-----------|-----------------|------|
| **GoatCounter** | ✓ | ✓ | ✓ | Free / pay-what-you-want |
| **Plausible** | ✓ | ✓ | ✓ | Paid (free trial) |
| **Cloudflare Web Analytics** | ✓ | ✓ | ✗ | Free |

**Recommended for Confidant:** **GoatCounter** – free or cheap, page views + geography + download clicks (tracked as custom events: `download-macos-arm`, `download-windows-msi`, etc.).

Leave analytics **disabled** by not setting any provider (default).

## Local development

1. Copy `landing/.env.example` to `landing/.env.local`.
2. Uncomment and set the variables for your chosen provider (see example file).
3. Run `npm run dev` in `landing/`. The script loads only when the env vars are set.

## Production (GitHub Pages)

Analytics are baked in at **build time**. To enable them for the deployed site:

1. **Create repository secrets** (GitHub repo → Settings → Secrets and variables → Actions):
   - For **GoatCounter**: add `NEXT_PUBLIC_ANALYTICS_PROVIDER` = `goatcounter` and `NEXT_PUBLIC_GOATCOUNTER_CODE` = your site code from [goatcounter.com](https://www.goatcounter.com) (Settings → Site code).
   - For **Plausible**: add `NEXT_PUBLIC_ANALYTICS_PROVIDER` = `plausible` and `NEXT_PUBLIC_ANALYTICS_DOMAIN` = `confidant.one`.
   - For **Cloudflare**: add `NEXT_PUBLIC_ANALYTICS_PROVIDER` = `cloudflare` and `NEXT_PUBLIC_CF_BEACON_TOKEN` = your token from the Cloudflare Web Analytics “Manage site” snippet.

2. **Pass them into the deploy workflow** – in `.github/workflows/deploy-landing.yml`, add `env` to the “Install and build landing” step so the build sees the same `NEXT_PUBLIC_*` variables (values from secrets). Example:

   The workflow already passes these secrets; just add the ones you need (see `.github/workflows/deploy-landing.yml`).

3. Push a change that triggers the workflow (e.g. under `landing/`). The next deploy will include analytics if the secrets are set.

## Implementation

- **Analytics script:** `landing/src/components/analytics.tsx` – reads `NEXT_PUBLIC_*` and injects the provider’s script via `next/script` with `strategy="afterInteractive"`.
- **Layout:** `landing/src/app/layout.tsx` – renders `<Analytics />` in the body.
- **Download events (GoatCounter):** `landing/src/components/confidant-download.tsx` – each download button has an `onClick` that calls `window.goatcounter.count({ path: 'download-macos-arm' | 'download-windows-msi' | …, title: label, event: true })`. Events appear in GoatCounter under “Events” in the dashboard.
- Unset or unknown provider → no script is loaded.
