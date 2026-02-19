# HexLogic Build Configuration Reference

This is a reference of every build-related setting found in the HexLogic app, organized for reuse in a new project.

---

## Expo Account and EAS Project

- **Expo Owner:** `joshmthurman`
- **EAS Project ID:** `929b54d4-93dd-4d1b-8e22-d493bb373a12`
- **EAS CLI version required:** `>= 16.32.0`
- **App version source:** `remote` (EAS manages version numbers)

## App Identity (app.json)

- **App name:** `HexLogicMobile`
- **Slug:** `hexlogicmobile`
- **Version:** `1.0.3`
- **Scheme (deep linking):** `hexlogicmobile`
- **Orientation:** `portrait`
- **User interface style:** `automatic` (supports light/dark)

## iOS / TestFlight Configuration

- **Bundle Identifier:** `us.hexlogic.app`
- **Build Number:** `11` (auto-incremented on production builds via EAS)
- **Supports Tablet:** `true`
- **App Store Connect App ID (ascAppId):** `6758524813`
- **infoPlist overrides:**
  - `ITSAppUsesNonExemptEncryption: false` (skips the export compliance question on TestFlight)

## Android Configuration

- **Package name:** not explicitly set (defaults based on slug)
- **Edge-to-edge:** enabled
- **Predictive back gesture:** disabled
- **Adaptive icon:**
  - Background color: `#E6F4FE`
  - Foreground image: `./assets/images/android-icon-foreground.png`
  - Background image: `./assets/images/android-icon-background.png`
  - Monochrome image: `./assets/images/android-icon-monochrome.png`

## EAS Build Profiles (eas.json)

- **development** -- `developmentClient: true`, `distribution: internal`
- **preview** -- `distribution: internal`
- **production** -- `autoIncrement: true`

## EAS Submit (TestFlight / App Store)

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "6758524813"
    }
  }
}
```

The typical workflow to push to TestFlight:

1. `eas build --platform ios --profile production`
2. `eas submit --platform ios --profile production`

## Icons and Splash Screen

- **App icon (iOS):** `./assets/images/icon.png`
- **Favicon (web):** `./assets/images/favicon.png`
- **Splash screen plugin config:**
  - Image: `./assets/images/splash-icon.png`
  - Image width: `200`
  - Resize mode: `contain`
  - Light background: `#ffffff`
  - Dark background: `#000000`

## Expo SDK and Key Dependencies

- **Expo SDK:** `~54.0.32`
- **React:** `19.1.0`
- **React Native:** `0.81.5`
- **TypeScript:** `~5.9.2`
- **New Architecture:** enabled (`newArchEnabled: true`)
- **React Compiler:** enabled
- **Typed Routes:** enabled

## Expo Plugins

- `expo-router` (file-based routing)
- `expo-splash-screen` (with config above)
- `expo-asset`

## Notable Dependencies

- `@react-native-async-storage/async-storage` -- local storage
- `@react-navigation/bottom-tabs` -- tab navigation
- `react-native-gesture-handler` -- gestures
- `react-native-reanimated` -- animations
- `react-native-svg` -- SVG rendering
- `expo-haptics` -- haptic feedback
- `expo-image` -- optimized images

## Managed Workflow

- No native `/ios` or `/android` folders (Expo managed workflow; these are gitignored and generated at build time)
- No `babel.config.js` or `metro.config.js` (using Expo defaults)
- No `.env` files checked in
- No CI/CD pipeline -- builds done manually via `eas build` / `eas submit`

## What You Need for Your Next App

For a new app, you will need to change at minimum:

- `name` and `slug` in `app.json`
- `ios.bundleIdentifier` (e.g., `us.yournewapp.app`)
- `scheme` for deep linking
- `extra.eas.projectId` (generated when you run `eas init`)
- `submit.production.ios.ascAppId` (from App Store Connect for the new app)
- `owner` if using a different Expo account
- All icon and splash screen image assets
