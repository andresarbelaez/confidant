# Confidant Mobile

On-device chat + RAG for iOS and Android (Expo). See [mobile-on-device-plan.md](../../docs/mobile-on-device-plan.md) and [mobile-rag-design.md](../../docs/mobile-rag-design.md).

## Setup

```bash
cd apps/confidant-mobile
npm install
```

Add app icons for production builds: place `icon.png` (1024×1024) and `adaptive-icon.png` (1024×1024) in `./assets/`. Expo will use defaults in development if missing.

## Run (development build required)

This app uses **RunAnywhere** (llama.cpp) for on-device LLM, so it needs a **development build**, not Expo Go.

### First-time: create native projects and run on iOS

**Prerequisite:** CocoaPods (for iOS native deps). Install with `brew install cocoapods` or `sudo gem install cocoapods` if you don’t have it.

```bash
npx expo prebuild
cd ios && pod install && cd ..
npx expo run:ios
```

Then start Metro (if not already running):

```bash
npm start
```

Use **`npx expo run:ios`** to build and run the app in the iOS simulator or on a device. The first run will download the SmolLM2 360M model when you tap “Download model” in the chat screen.

### Android

```bash
npx expo run:android
```

(Android emulator may not support the native LLM; use a physical ARM64 device if you see native library errors.)
