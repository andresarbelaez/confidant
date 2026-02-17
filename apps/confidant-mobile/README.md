# Confidant Mobile

On-device chat + RAG for iOS and Android (Expo). See [mobile-on-device-plan.md](../../docs/mobile-on-device-plan.md) and [mobile-rag-design.md](../../docs/mobile-rag-design.md).

## Setup

```bash
cd apps/confidant-mobile
npm install
```

Add app icons for production builds: place `icon.png` (1024×1024) and `adaptive-icon.png` (1024×1024) in `./assets/`. Expo will use defaults in development if missing.

## Run

```bash
npm start
```

Then press `i` for iOS simulator or `a` for Android emulator, or scan the QR code with Expo Go.

## Development build (for native modules, e.g. llama.cpp)

When integrating @runanywhere/llamacpp or llama.rn, create a development build:

```bash
npx expo install expo-dev-client
npx expo prebuild
```

Then build and run with Xcode (iOS) or Android Studio (Android).
