// Run after `npx cap add android`. Applies the project-specific parts of the
// native shell: the io.guessio.app:// sign-in link, the notification permission, version numbers, and release signing.
// Env: ANDROID_VERSION_NAME, ANDROID_VERSION_CODE; KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD (signing).
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const gradlePath = 'android/app/build.gradle';
const scheme = JSON.parse(readFileSync('capacitor.config.json', 'utf8')).appId; // must equal the backend's APP_DEEP_LINK_SCHEME

let manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes(`android:scheme="${scheme}"`)) {
  const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${scheme}" />
            </intent-filter>
`;
  // Goes inside <activity ...MainActivity>, right before its closing tag.
  const next = manifest.replace(/(<activity[\s\S]*?)(<\/activity>)/, `$1${filter}        $2`);
  if (next === manifest) throw new Error('Could not find <activity> in AndroidManifest.xml');
  manifest = next;
  writeFileSync(manifestPath, manifest);
}

// Android 13+ only shows the notification prompt to an app that declares this. The push plugin asks for the
// permission at run time but does not declare it.
manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android.permission.POST_NOTIFICATIONS')) {
  const permission = '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n';
  const next = manifest.replace(/(\s*)<\/manifest>/, `\n${permission}</manifest>`);
  if (next === manifest) throw new Error('Could not find </manifest> in AndroidManifest.xml');
  writeFileSync(manifestPath, next);
}

// Launcher icon: replaces Capacitor's default icons (mipmap PNGs and the adaptive icon background colour) with
// the guessIo ones. Regenerate them with tools/generate-android-icons.py when the artwork changes.
const iconResDir = 'native-assets/android/res';
if (!existsSync(iconResDir)) throw new Error(`Launcher icons not found at ${iconResDir}`);
cpSync(iconResDir, 'android/app/src/main/res', { recursive: true });

// Launch screen: Android shows its own screen before the web view exists. Give it the app background colour and
// no icon, so it blends into the full-screen splash in index.html instead of showing a small icon on a mismatched colour.
const stylesPath = 'android/app/src/main/res/values/styles.xml';
let styles = readFileSync(stylesPath, 'utf8');
if (!styles.includes('windowSplashScreenBackground')) {
  const launchStyle = /(<style\s+name="AppTheme\.NoActionBarLaunch"[^>]*>)([\s\S]*?)(<\/style>)/;
  if (!launchStyle.test(styles)) throw new Error('Could not find AppTheme.NoActionBarLaunch in styles.xml');
  styles = styles.replace(launchStyle, (_match, open, _body, close) =>
    `${open}
        <item name="android:background">@color/splash_background</item>
        <item name="windowSplashScreenBackground">@color/splash_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon_transparent</item>
    ${close}`);
  writeFileSync(stylesPath, styles);
}

// Push needs the Firebase config the CI step writes from the GOOGLE_SERVICES_JSON_BASE64 secret.
const pushReady = existsSync('android/app/google-services.json');
if (!pushReady) console.warn('WARNING: android/app/google-services.json is missing. The APK will build, but notifications cannot work in it (see ANDROID_BUILD.md).');

let gradle = readFileSync(gradlePath, 'utf8');
const name = process.env.ANDROID_VERSION_NAME;
const code = process.env.ANDROID_VERSION_CODE;
if (name) gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${name}"`);
if (code) gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${code}`);

if (process.env.KEYSTORE_PATH && !gradle.includes('signingConfigs.release')) {
  const signing = `    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH"))
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
`;
  if (!/\n\s*buildTypes\s*\{/.test(gradle)) throw new Error('Could not find buildTypes in app/build.gradle');
  gradle = gradle.replace(/\n(\s*)buildTypes\s*\{/, `\n${signing}$&`.replace('$&', '\n$1buildTypes {'));
  gradle = gradle.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{)/, '$1\n            signingConfig signingConfigs.release');
}
writeFileSync(gradlePath, gradle);
console.log(`Android shell prepared (scheme ${scheme}, version ${name ?? 'unchanged'}, signing ${process.env.KEYSTORE_PATH ? 'on' : 'off'}, push ${pushReady ? 'on' : 'off'}).`);
