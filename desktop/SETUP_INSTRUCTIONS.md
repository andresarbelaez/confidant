# Desktop App Setup Instructions

## Prerequisites Installation

Before you can run the desktop app, you need to install:

### 1. Rust (Required) ✅ INSTALLED

Rust is needed for the Tauri backend. 

**Status**: ✅ Installed
- rustc 1.93.0
- cargo 1.93.0

If you need to reload the environment in a new terminal:
```bash
source $HOME/.cargo/env
```

### 2. Node.js Dependencies

Once you have network connectivity, install Node.js dependencies:

```bash
cd desktop
npm install
```

This will install:
- React, TypeScript, Vite
- Tauri CLI (as dev dependency)
- All other frontend dependencies

### 3. Verify Setup

After installing dependencies, test the setup:

```bash
# Start development server
npm run dev
```

This should:
1. Start Vite dev server on port 1420
2. Build Rust backend
3. Launch Tauri window with the app

## Current Status

✅ **Phase 1 Complete**: Project structure and configuration files created

**Created Files:**
- `desktop/package.json` - Node.js dependencies
- `desktop/vite.config.ts` - Vite configuration for Tauri
- `desktop/tsconfig.json` - TypeScript configuration
- `desktop/src-tauri/Cargo.toml` - Rust dependencies
- `desktop/src-tauri/tauri.conf.json` - Tauri app configuration
- `desktop/src-tauri/src/main.rs` - Rust entry point
- `desktop/src/` - React frontend (basic starter)

## Next Steps

1. **Install Rust** (if not already installed)
2. **Install npm dependencies** (when network is available):
   ```bash
   cd desktop
   npm install
   ```

3. **Test the setup**:
   ```bash
   npm run dev
   ```

4. **Begin Phase 2**: Migrate React components from `web/src/` to `desktop/src/`

## Troubleshooting

### Rust not found
- Make sure Rust is installed: `rustc --version`
- If installed but not found, restart terminal or run `source $HOME/.cargo/env`

### npm install fails
- Check network connectivity
- Try using a different network or VPN
- Check npm registry: `npm config get registry`

### Tauri build fails
- Ensure Rust is properly installed
- Check that all Rust dependencies can be fetched
- Review `desktop/src-tauri/Cargo.toml` for any issues

## Notes

- The app is configured to run on port 1420 (Tauri default)
- Development mode uses Vite dev server
- Production builds will bundle everything into a native app
- Rust backend code will go in `desktop/src-tauri/src/`
