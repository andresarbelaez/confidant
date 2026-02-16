# Custom domain (confidant.one) for GitHub Pages

This guide connects **confidant.one** to the GitHub Pages site that serves the Confidant landing page (built from `landing/` and deployed to `docs/`).

## Prerequisites

- You own the domain **confidant.one** (e.g. via Namecheap).
- GitHub Pages is already enabled for this repo: **Settings → Pages** → Source **Deploy from a branch** → Branch **main** → Folder **/docs**.

## 1. Configure DNS at your registrar (Namecheap)

In your domain’s DNS settings, add the following.

### Apex domain (confidant.one)

Add **four A records** for the apex so `confidant.one` (without www) points to GitHub:

| Type | Host | Value |
|------|------|--------|
| A    | `@`  | `185.199.108.153` |
| A    | `@`  | `185.199.109.153` |
| A    | `@`  | `185.199.110.153` |
| A    | `@`  | `185.199.111.153` |

- **Host**: `@` (means the apex, i.e. confidant.one).
- **Value**: the four IPs above (one A record per IP).

### Optional: www subdomain (www.confidant.one)

If you want **www.confidant.one** to work as well:

| Type  | Host | Value |
|-------|------|--------|
| CNAME | `www` | `andresarbelaez.github.io` |

(Replace `andresarbelaez` with your GitHub username if the repo is under a different account.)

### Namecheap-specific notes

- **“Host”** might be labeled differently; use `@` for apex.
- Remove any conflicting A or CNAME records for `@` or `www` that point elsewhere.
- DNS can take from a few minutes up to 24–48 hours to propagate.

---

## 2. Set the custom domain in GitHub

1. Open the repo: **https://github.com/andresarbelaez/confidant**
2. Go to **Settings → Pages** (left sidebar).
3. Under **Custom domain**, enter: **confidant.one**
4. Click **Save**.
5. Wait for DNS to propagate. GitHub will show a warning until it can verify the domain.
6. When the check passes, enable **Enforce HTTPS** (recommended).

If you use **www**, you can choose either **confidant.one** or **www.confidant.one** as the custom domain in GitHub. The other can be set up as a redirect at your registrar if desired.

---

## 3. Verify

- Visit **https://confidant.one**. You should see the Confidant landing page.
- After enabling **Enforce HTTPS**, confirm the padlock and that there are no mixed-content warnings.

---

## Repo changes for the custom domain

The landing app is built **without** a `basePath` so it works at the **root** of confidant.one (e.g. `https://confidant.one/`).

- **`landing/next.config.ts`** – `basePath` is set to `''`.
- **`landing/src/components/confidant-download.tsx`** – Logo paths use `/${d.logo}` (no `/confidant` prefix).

With this setup, the **canonical URL** is **https://confidant.one**. The old project-page URL (**https://andresarbelaez.github.io/confidant/**) may no longer load correctly (assets can 404) because the site is built for the root. You can add a redirect from the GitHub repo description or a separate redirect page later if you want to send github.io visitors to confidant.one.

---

## Troubleshooting

- **“Domain’s DNS record could not be retrieved”** – Wait for DNS propagation; ensure the four A records (and CNAME for www if used) are correct.
- **Certificate / HTTPS not ready** – After DNS is correct, GitHub provisions a certificate; enable **Enforce HTTPS** once the custom domain shows as verified.
- **Broken assets or 404s** – Ensure the latest deploy has run (push to `main` that touches `landing/`) so `docs/` contains the build with `basePath: ''`.

For more on how the landing is built and deployed, see [GITHUB_PAGES.md](GITHUB_PAGES.md) and [landing/README.md](../landing/README.md).
