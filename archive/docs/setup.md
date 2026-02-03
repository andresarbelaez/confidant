# Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

## Initial Setup

1. **Install dependencies**:
   ```bash
   cd web
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   - Navigate to `http://localhost:5173`
   - The app should load with the network monitor visible

## Service Worker

The Service Worker is automatically registered when you run the app. To verify:

1. Open browser DevTools (F12)
2. Go to Application tab
3. Check Service Workers section
4. You should see "dant" service worker registered

## Network Monitoring

The Network Monitor component displays:
- Online/Offline status
- Bytes transmitted (should be 0 for queries)
- Requests blocked/allowed
- Privacy badge when zero bytes transmitted

## Build for Production

```bash
npm run build
```

The built files will be in `dist/` directory.

## Next Steps

See [architecture.md](architecture.md) for detailed architecture information.
