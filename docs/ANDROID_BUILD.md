# Building the Mausam Android app

Everything needed to take a fresh clone to the app running on a physical phone.

## Before anything else: this is not a standalone Android project

`android/` is a Capacitor wrapper. The app's entire user interface is the React
web app in `frontend/`, compiled into `dist/` and then copied into
`android/app/src/main/assets/public`. Two things the Gradle build depends on are
generated, not committed:

| Generated | By | Why it is not in Git |
| --- | --- | --- |
| `android/app/src/main/assets/public/` | `npx cap sync` | It is build output of `frontend/` |
| `android/capacitor-cordova-android-plugins/` | `npx cap sync` | Regenerated from the installed plugins |
| The `:capacitor-android` and `:capacitor-geolocation` Gradle modules | `npm install` | They live inside `node_modules/` |

**Opening `android/` in Android Studio before running the npm steps will fail
the Gradle sync.** `android/settings.gradle` detects this and prints the exact
commands to run, so a failed sync is not a broken repository.

## Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22 | Pinned in `.mise.toml`. Node 24 also works. |
| Android Studio | Narwhal (2025.1) or newer | Needed for Android Gradle Plugin 8.13. |
| JDK | 21 | `android/app/capacitor.build.gradle` compiles against Java 21. Android Studio's bundled JBR 21 satisfies this; a standalone JDK 17 does not. |
| Android SDK | API 36 | `compileSdk`/`targetSdk` are 36 in `android/variables.gradle`. Install it via Tools → SDK Manager. |
| Min Android version | 7.0 (API 24) | `minSdkVersion` in `android/variables.gradle`. |

Gradle itself does not need installing — `./gradlew` downloads 8.14.3 on first
use (roughly 200 MB, a few minutes).

## Build and run

From the **project root** — the folder containing `package.json`, not
`android/`:

```bash
npm install            # or: pnpm install --frozen-lockfile
npm run android        # build web app, copy into Android project, open Studio
```

Then in Android Studio: pick your device in the toolbar and press Run (▶).

To put the app on a phone over USB, enable **Developer options → USB debugging**
on the device first, and accept the "Allow USB debugging" prompt that appears
when you plug it in.

### The commands

| Command | What it does |
| --- | --- |
| `npm run android` | `android:sync`, then opens Android Studio |
| `npm run android:sync` | Builds the web app and copies it into `android/` |
| `npm run android:run` | Syncs, then builds and installs on a connected device |
| `npm run build:android` | Builds `dist/` for the app only (no copy into `android/`) |

## The one rule that catches everyone

**Editing `frontend/` and pressing Run in Android Studio changes nothing on the
phone.**

Android Studio builds `android/`. It has no idea `frontend/` exists. The web app
reaches the phone only through the copy step, so after every web change:

```bash
npm run android:sync
```

then Run again. If a change you know you made is not visible on the device, this
is almost always why.

## Why the app talks to Vercel and not to localhost

Capacitor serves the bundle from `https://localhost` **on the phone itself**. So
inside the packaged app:

- a relative URL like `/api/weather` becomes `https://localhost/api/weather` —
  the phone, where nothing is listening;
- `http://localhost:3000` — the address in your development `.env` — is also the
  phone, not your laptop.

Either one makes every weather request fail, while the app still installs and
opens. It looks like a backend outage; it is a build configuration mistake.

`.env.android` (committed, no secrets) exists to prevent that. It is applied by
`vite build --mode android`, which all the `android:*` scripts use, and it
overrides whatever is in your local `.env`. It points the app at the deployed
serverless API:

```
VITE_WEATHER_API_URL=https://mausam-roan.vercel.app/api/weather
```

`scripts/verify-android-bundle.mjs` runs after the build and fails it if a
localhost address survived into the bundle, or if no absolute HTTPS endpoint was
baked in. A plain `npm run build` is deliberately rejected for Android use — it
targets the website, where relative API routes are correct.

### Pointing the app at a different backend

Change the URLs in `.env.android` and re-run `npm run android:sync`. To test
against a Fastify server on your own machine, expose it over HTTPS (ngrok,
Cloudflare Tunnel, or your LAN IP with a certificate) and use that origin — a
plain `http://` address is additionally blocked by Android's cleartext policy.

## What the app needs at runtime

- **Internet** — all weather data is fetched live; there is no offline mode.
- **Location permission** — requested on first use through Capacitor's
  geolocation plugin (`ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` are
  declared in `AndroidManifest.xml`). Denying it is not fatal: manual
  place/PIN-code search still works.

AQI depends on `DATA_GOV_IN_API_KEY` being configured **on Vercel**, not in the
app. If it is missing the AQI card is omitted and everything else still works.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Gradle sync fails with a "not ready to build yet" message | npm steps not run | Follow the commands it prints |
| `Project directory ... capacitor-cordova-android-plugins does not exist` | Sync never ran | `npm run android:sync` |
| App opens to a blank white screen | `assets/public` missing or empty | `npm run android:sync`, then rebuild |
| Weather never loads, everything else renders | Bundle built without `--mode android` | `npm run android:sync` (never bare `npx cap sync`) |
| Your web changes are not on the phone | Ran Android Studio without re-syncing | `npm run android:sync`, then Run |
| `invalid source release: 21` | Building with JDK 17 | Use Android Studio's bundled JBR 21 (Settings → Build Tools → Gradle → Gradle JDK) |
| `Failed to find target with hash string 'android-36'` | SDK 36 not installed | Tools → SDK Manager → install API 36 |
| `bad interpreter: /bin/sh^M` running `./gradlew` | Line endings mangled on clone | `.gitattributes` prevents this; re-clone if you hit it |

## Signing a release build

`npm run android:sync` then Build → Generate Signed App Bundle / APK in Android
Studio. Keep the keystore and its passwords **outside this repository** —
`android/.gitignore` does not exclude `.jks`/`.keystore` files, so a keystore
placed inside `android/` can be committed by accident.
