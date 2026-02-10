# Cross-Compilation Guide for macOS and Windows

## TL;DR: Use CI/CD (Recommended)

**Cross-compiling Windows from macOS is not supported** for Tauri applications. The recommended approach is to use **GitHub Actions** (or similar CI/CD) to build for both platforms automatically.

## Why Cross-Compilation Doesn't Work

1. **Tauri relies on native toolchains**: Windows builds require MSVC toolchain, which only runs on Windows
2. **Rust limitation**: Cross-compilation from macOS to Windows MSVC is not supported by Rust itself
3. **Native dependencies**: Your app uses Python subprocesses and native libraries that are platform-specific

## Option 1: GitHub Actions (Recommended)

We've set up a GitHub Actions workflow (`.github/workflows/build-release.yml`) that:

- Builds for **macOS** (both Intel and Apple Silicon)
- Builds for **Windows** (x64)
- Creates installers (.dmg, .msi, .exe)
- Uploads releases automatically

### Usage

1. **Push a tag** to trigger builds:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **Or use manual trigger**: Go to Actions → Build Release → Run workflow

3. **Download installers** from the GitHub Releases page

### Setup Requirements

- Repository must be on GitHub
- No additional secrets needed (uses `GITHUB_TOKEN`)

## Option 2: Windows VM or Dual Boot

If you need local Windows builds:

1. **Set up Windows VM** (Parallels, VMware, VirtualBox)
   - Install Windows 10/11
   - Install Rust: `rustup-init.exe` from rustup.rs
   - Install Node.js 18+
   - Clone repo and run `npm run build`

2. **Or use dual boot** / separate Windows machine

3. **Build command** (same as macOS):
   ```bash
   cd desktop
   npm run build:installer
   ```

## Option 3: GitHub Actions with Manual Trigger

For testing builds without creating releases:

1. **Create a test workflow** (`.github/workflows/build-test.yml`):
   ```yaml
   name: Build Test
   on: [workflow_dispatch]
   jobs:
     build-windows:
       runs-on: windows-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
         - uses: dtolnay/rust-toolchain@stable
         - run: cd desktop && npm ci && npm run build:installer
         - uses: actions/upload-artifact@v4
           with:
             name: windows-installer
             path: desktop/src-tauri/target/release/bundle/**/*
   ```

2. **Download artifacts** from the Actions run page

## Option 4: Use Tauri's Official Action

The workflow uses `tauri-apps/tauri-action@v0` which handles:
- Building for multiple platforms
- Creating installers
- Uploading to GitHub Releases
- Code signing (if configured)

## Current Build Scripts

Your existing scripts work on both platforms:

- **`scripts/tauri-build.sh`**: Works on macOS and Windows (when run on Windows)
- **`scripts/setup-python-bundle.sh`**: Detects platform and downloads correct Python bundle
- **`npm run build:installer`**: Builds with Python bundle included

## Platform-Specific Notes

### macOS
- Builds `.app` bundle and `.dmg` installer
- Requires `create-dmg` (installed via Homebrew in CI)
- Supports both Intel (`x86_64-apple-darwin`) and Apple Silicon (`aarch64-apple-darwin`)

### Windows
- Builds `.msi` (Windows Installer) and `.exe` (NSIS installer)
- Requires Windows machine or CI/CD
- Uses `x86_64-pc-windows-msvc` target

## Troubleshooting

### GitHub Actions fails
- Check Actions logs for specific errors
- Ensure `BUNDLE_PYTHON=1` is set if you want Python bundled
- Verify Node.js and Rust versions match local setup

### Windows build fails locally
- Ensure you're on a Windows machine
- Install Visual Studio Build Tools (for MSVC)
- Run `rustup target add x86_64-pc-windows-msvc`

### Python bundle issues
- The `setup-python-bundle.sh` script detects platform automatically
- On Windows, it downloads `x86_64-pc-windows-msvc` Python bundle
- Ensure network access for downloads

## Next Steps

1. **Test the GitHub Actions workflow**:
   ```bash
   git add .github/workflows/build-release.yml
   git commit -m "Add CI/CD for cross-platform builds"
   git push
   ```

2. **Create a test release**:
   ```bash
   git tag v0.1.0-test
   git push origin v0.1.0-test
   ```

3. **Check Actions tab** to see builds in progress

4. **Download installers** from Releases page when complete
