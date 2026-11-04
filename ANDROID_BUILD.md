# GuessIo Android app (APK) and OTA updates

The APK is a Capacitor shell around this web app. Web changes reach players through OTA bundle updates; the APK is only rebuilt for native-level changes (OTA spec v2.0.0).

## One-time setup

1. **Push this project to a public GitHub repo** (the app reads releases from the GitHub API without a login, so the repo must be public).
2. **Repo Settings > Actions > General > Workflow permissions** > "Read and write permissions".
3. **Repo Settings > Secrets and variables > Actions > Variables**: add `VITE_API_BASE_URL` and `VITE_WS_URL` (your production backend URLs, https/wss). Optional: `VITE_SUPPORT_GOOGLE_FORM_URL`.
4. **Create the signing key once** and keep a backup. Losing it means players must uninstall before they can install a new APK.
   ```bash
   keytool -genkeypair -v -keystore guessio.keystore -alias guessio -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 guessio.keystore   # macOS: base64 -i guessio.keystore
   ```
   Add these **Secrets**: `ANDROID_KEYSTORE_BASE64` (the base64 output), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`guessio`), `ANDROID_KEY_PASSWORD`.
5. Run `npm install` locally once and commit the updated `package-lock.json`.

## Build the APK

Actions tab > **Build Android APK** > Run workflow. When it finishes, the signed file is at
`https://github.com/<owner>/<repo>/releases/download/apk-latest/guessIo.apk` (also attached to the run as an artifact). Send that link to players; they open it and accept Android's install prompt.

## Backend settings (environment variables only, no code change)

| Variable | Value |
|---|---|
| `CLIENT_ORIGIN` | add `https://localhost` to the list (the app's WebView origin) |
| `APP_APK_URL` | the `apk-latest` link above |
| `APP_LATEST_NATIVE_VERSION` | the `version` in package.json at the time of the APK build |
| `APP_DEEP_LINK_SCHEME` | `io.guessio.app` (the default) |

Google OAuth for the app needs nothing new: sign-in opens in the phone's browser and returns through `io.guessio.app://`.

## Day to day

- **Push to `main`** : the *Release Web Bundle* workflow publishes a new bundle (release `v<run>`, version `<major>.<minor>.<run>`). Each phone checks once per launch, downloads it, and applies it on a lobby screen, or on the next launch if the player is in a match.
- **Native change** (new plugin, permission, Capacitor upgrade): bump `version` in package.json, run *Build Android APK*, then raise `APP_LATEST_NATIVE_VERSION` on the backend. Players get a non-blocking "new version" prompt.
- If a new bundle fails to start, the updater rolls back to the previous one on the next launch.

## Notes

- `android/` is generated in CI (`npx cap add android`, then `scripts/prepare-android.mjs`). To build locally you need Node 20, JDK 21 and the Android SDK: `npm run build && npx cap add android && npm run android:prepare && npx cap sync android`.
- In the app, sign-in tokens are kept in the WebView's localStorage, so a player who closes the app stays signed in until the backend expires the refresh token. On the web they stay in sessionStorage (one tab, one session). See `src/lib/tokenStorage.js`. This is a web-bundle change, so it ships over OTA with no APK rebuild.
- Web push is not available in the app shell (needs a native push provider).
- The app uses Capacitor's default launcher icon until you generate one (e.g. with `@capacitor/assets` from `public/icon-512.png`).
