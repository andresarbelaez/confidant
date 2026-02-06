# GitHub Pages – Download site

This repo can serve a small download page for the Confidant desktop app from GitHub Pages.

## What’s included

- **`docs/index.html`** – Landing page with download buttons for macOS and Windows.
- **`docs/download-site.css`** – Styles for that page.

The page links to **GitHub Releases** using the pattern:

`https://github.com/OWNER/REPO/releases/latest/download/FILENAME`

If your repo is not `confidant/confidant`, edit the URLs in `docs/index.html` to use your `OWNER/REPO`. The exact installer filenames (e.g. `Confidant_0.1.0_aarch64.dmg`) are what Tauri produces when you run `npm run build` in `desktop/`; adjust the links if your build outputs different names.

## Enabling GitHub Pages

1. In your GitHub repo, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose **Branch**: `main` (or your default branch), **Folder**: `/docs`.
4. Save. The site will be available at:
   - **https://confidant.github.io/confidant** if the repo is `confidant/confidant`, or
   - **https://USERNAME.github.io/confidant** if the repo is `USERNAME/confidant`.

To use the root URL **https://confidant.github.io** (no path), you need a user or organization named `confidant` and a separate repo named `confidant.github.io`. Copy `docs/index.html` and `docs/download-site.css` into that repo’s root and enable Pages from that repo.

## Releases and download links

1. Build the desktop app (see [desktop/README.md](../desktop/README.md)) on macOS and/or Windows.
2. Create a **GitHub Release** (e.g. tag `v0.1.0-beta`), upload the installers from `desktop/src-tauri/target/release/bundle/`.
3. The download page uses `releases/latest/download/FILENAME`; “latest” is the most recent release. Keep installer filenames consistent across releases if you want “latest” to always work.

## Beta / security note

The download page includes a short note that beta builds are unsigned and users may see a security or Gatekeeper warning. This is expected for unsigned desktop apps.
