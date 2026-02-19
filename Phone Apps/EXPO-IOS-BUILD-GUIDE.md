# iOS Mobile App Build Guide -- Windows + iPhone + Expo

A complete, shareable reference for building and shipping an iOS app using **Windows**, **Expo**, and **TestFlight** -- no Mac required.

---

## 1) What This Guide Assumes

### You have

- A **Windows** PC
- An **iPhone**
- A decent Wi-Fi network (phone and PC on the same network)
- A code editor (e.g. **Cursor**)
- An **Apple Developer** account ($99/year) for TestFlight and App Store distribution

### You do NOT need

- macOS, Xcode, or the iOS Simulator
- Local native iOS builds on your machine

### Important reality check

- **Expo Go** lets you build and run many apps on your iPhone with zero native tooling.
- If you need **custom native modules** not supported by Expo Go, use **EAS Build** (cloud) to produce an iOS binary.
- **TestFlight** uploads are handled entirely through EAS Submit -- no Mac required.

---

## 2) One-Time Setup

Install these once on your Windows machine:

| Tool | Install |
|---|---|
| **Node.js (LTS)** | [nodejs.org](https://nodejs.org) |
| **Git** | [git-scm.com](https://git-scm.com) |
| **Cursor** | [cursor.com](https://cursor.com) |
| **EAS CLI** | `npm i -g eas-cli` |

On your iPhone:

- Install **Expo Go** from the iOS App Store.

Verify everything is working:

```bash
node -v
npm -v
git --version
eas --version
```

---

## 3) Creating a New Project

```bash
npx create-expo-app your-app-name
cd your-app-name
```

Then initialize EAS for cloud builds:

```bash
eas login
eas init
```

`eas init` will:
- Link the project to your Expo account
- Generate a unique **EAS Project ID** and write it into `app.json` under `extra.eas.projectId`

---

## 4) app.json Reference

Below is a complete `app.json` template with placeholder values. Each field includes what it is and how to get the real value.

```json
{
  "expo": {
    "name": "YourAppName",
    "slug": "your-app-name",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "your-app-name",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.yourapp",
      "buildNumber": "1",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#FFFFFF",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      "expo-asset"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "<your-eas-project-id>"
      }
    },
    "owner": "<your-expo-username>"
  }
}
```

### Field-by-field breakdown

#### You choose these

- **`name`** -- the display name of your app (shown under the icon on the home screen). Pick whatever you want.
- **`slug`** -- a URL-safe identifier for your project on Expo's servers. Typically a lowercase-kebab version of the name.
- **`version`** -- your public-facing version string (e.g. `1.0.0`). Bump this for each App Store release.
- **`scheme`** -- the deep-link URL scheme (e.g. `your-app-name://`). Usually matches the slug.
- **`orientation`** -- `portrait`, `landscape`, or `default`. Most phone apps use `portrait`.
- **`userInterfaceStyle`** -- `automatic` (follows system light/dark), `light`, or `dark`.

#### iOS-specific

- **`ios.bundleIdentifier`** -- a unique reverse-domain string (e.g. `com.yourcompany.yourapp`). You register this in the [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list) under Certificates, Identifiers & Profiles > Identifiers. Each app needs its own.
- **`ios.buildNumber`** -- an integer string that Apple uses to distinguish builds of the same version. When `autoIncrement` is enabled in `eas.json`, EAS manages this for you automatically.
- **`ios.supportsTablet`** -- set `true` if your app should run on iPad, `false` for iPhone-only.
- **`ios.infoPlist.ITSAppUsesNonExemptEncryption`** -- set `false` to skip the "Export Compliance" question every time you upload to TestFlight. Only set `true` if your app implements its own encryption beyond standard HTTPS.

#### Generated values

- **`extra.eas.projectId`** -- a UUID that links your local project to Expo's cloud services. Generated automatically when you run `eas init`. Do not make this up.
- **`owner`** -- your Expo account username. Find it by running `eas whoami` or checking [expo.dev](https://expo.dev) after logging in.

#### Feature flags (optional but recommended)

- **`newArchEnabled`** -- enables React Native's New Architecture (Fabric renderer + TurboModules). Recommended for new projects.
- **`experiments.typedRoutes`** -- enables TypeScript-checked route names when using `expo-router`.
- **`experiments.reactCompiler`** -- enables the React Compiler for automatic memoization.

---

## 5) eas.json Reference

This file configures cloud builds and App Store submission. Create it by running `eas build:configure`, or write it manually:

```json
{
  "cli": {
    "version": ">= 16.32.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "<your-app-store-connect-app-id>"
      }
    }
  }
}
```

### Build profiles

- **`development`** -- produces a debug build with the Expo Dev Client. `distribution: internal` means it is only installable via a direct link (not the App Store). Use this for daily development when you've outgrown Expo Go.
- **`preview`** -- a release-like build for internal testing. Same internal distribution, but no dev tools.
- **`production`** -- the build you submit to TestFlight and the App Store. `autoIncrement: true` bumps the `ios.buildNumber` automatically on each build.

### Submit configuration

- **`ascAppId`** -- your app's numeric ID in App Store Connect. To find it:
  1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
  2. Go to **My Apps** and select your app (or create a new one)
  3. On the **App Information** page, look for **Apple ID** -- it's a number like `6758524813`

### Version management

- **`appVersionSource: "remote"`** -- EAS tracks the current build number on its servers so you never accidentally reuse one. Recommended.

---

## 6) Icons, Splash Screen, and Assets

### App icon (iOS / App Store)

- Provide a **1024x1024 PNG** with no transparency (Apple rejects transparent icons)
- Keep important content away from the edges -- iOS applies corner rounding automatically
- Place at: `./assets/images/icon.png`

### Adaptive icon (Android)

- **Foreground image:** the logo/mark, centered with safe-area padding -- `./assets/images/android-icon-foreground.png`
- **Background image:** a flat background or pattern -- `./assets/images/android-icon-background.png`
- **Monochrome image:** a single-color silhouette for themed icons -- `./assets/images/android-icon-monochrome.png`
- **Background color:** a hex fallback if the background image isn't used (e.g. `#FFFFFF`)

### Splash screen

- A simple centered mark on a solid background
- Test on notched/Dynamic Island screens to ensure nothing is cropped
- Configuration lives in the `expo-splash-screen` plugin entry in `app.json` (see section 4)

### Favicon (web)

- Standard browser favicon -- `./assets/images/favicon.png`

### Source file best practices

- Keep a vector master (`.svg`, `.ai`, or `.fig`) for your logo
- Export PNGs from the vector for each required size
- Write down your brand colors in hex so they stay consistent across icon backgrounds, splash screens, and in-app theming

### Asset checklist

- [ ] Logo master exists (vector format)
- [ ] App icon 1024x1024 PNG (no transparency)
- [ ] Splash image created and tested on real iPhone
- [ ] Android adaptive icon images created (foreground, background, monochrome)
- [ ] Brand colors documented (hex values)

---

## 7) Common Commands

### Development

| Command | What it does |
|---|---|
| `npm install` | Install project dependencies |
| `npx expo start` | Start the dev server (shows QR code) |
| `npx expo start -c` | Start with cache cleared (common fix for stale builds) |
| `npx expo start --tunnel` | Start with tunnel (use when phone can't reach PC on LAN) |
| `npx expo start --web` | Start and open in a web browser (quick UI iteration) |

### Diagnostics

| Command | What it does |
|---|---|
| `npx expo doctor` | Check for common environment and dependency issues |
| `npx expo upgrade` | Upgrade the Expo SDK and related dependencies |

### EAS (Cloud Builds and Submission)

| Command | What it does |
|---|---|
| `eas login` | Log in to your Expo account |
| `eas whoami` | Show your current Expo username |
| `eas init` | Link project to EAS and generate a project ID |
| `eas build:configure` | Generate `eas.json` if it doesn't exist |
| `eas build -p ios` | Build iOS in the cloud (no Mac needed) |
| `eas build -p ios --profile development` | Build a dev client for on-device debugging |
| `eas submit -p ios` | Submit the latest iOS build to TestFlight |

---

## 8) Development Workflow

### Running with Expo Go

1. Start the dev server: `npx expo start`
2. On your iPhone, open the **Camera** app
3. Scan the QR code shown in the terminal
4. Tap the banner to open in **Expo Go**

### If Expo Go won't connect

- Confirm your phone and PC are on the **same Wi-Fi network**
- Try tunnel mode: `npx expo start --tunnel`
- Restart Expo Go and the dev server

### When Expo Go is not enough

You've outgrown Expo Go if you need:
- A native SDK not bundled in Expo Go
- Custom native configuration (e.g. background audio, Bluetooth)
- A native module that requires compilation

**Next steps:**
1. Run `eas build -p ios --profile development` to produce a **Dev Client** build
2. Install it on your iPhone via the link EAS provides
3. Continue developing -- the Dev Client works like Expo Go but supports your custom native code
4. When ready to ship, switch to the `production` profile

---

## 9) TestFlight Deployment

### Prerequisites

- An [Apple Developer account](https://developer.apple.com) ($99/year)
- An app created in [App Store Connect](https://appstoreconnect.apple.com) with a matching bundle identifier
- The `ascAppId` from App Store Connect added to your `eas.json` (see section 5)

### Step-by-step

1. **Build for production:**

```bash
eas build --platform ios --profile production
```

This queues a cloud build. EAS handles code signing automatically. Wait for it to complete (typically 10-20 minutes).

2. **Submit to TestFlight:**

```bash
eas submit --platform ios --profile production
```

This uploads the build to App Store Connect. After Apple processes it (usually 5-15 minutes), it appears in TestFlight.

3. **Distribute via TestFlight:**
   - Open the TestFlight tab in App Store Connect
   - Add internal or external testers
   - Testers receive an invite and install via the TestFlight app on their iPhone

### Version bumping

- `version` in `app.json` is your public release version (e.g. `1.0.0` -> `1.1.0`). Bump this when shipping a meaningful update.
- `buildNumber` is managed by EAS automatically when `autoIncrement` is on. You generally don't touch it.

---

## 10) Gotchas and Tips

- **`ITSAppUsesNonExemptEncryption: false`** -- add this to `infoPlist` or Apple will ask you about export compliance on every single TestFlight upload.
- **Tunnel mode** (`--tunnel`) uses ngrok under the hood. It's slower but works when LAN connectivity between your PC and phone is unreliable.
- **Clear cache** (`npx expo start -c`) fixes a surprising number of "it worked yesterday" problems.
- **`appVersionSource: "remote"`** in `eas.json` prevents build-number collisions when building from multiple machines.
- **Managed workflow** means you never check in `/ios` or `/android` folders. They are generated in the cloud at build time. Keep them in `.gitignore`.
- **No `babel.config.js` or `metro.config.js` needed** unless you have custom requirements -- Expo's defaults work out of the box.
- **Expo Go has SDK limitations** -- if a library's docs say "requires custom native code," that's your sign to move to a Dev Client build.
