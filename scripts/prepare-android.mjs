// Run after `npx cap add android`. Applies the project-specific parts of the
// native shell: the io.guessio.app:// sign-in link, version numbers, and release signing.
// Env: ANDROID_VERSION_NAME, ANDROID_VERSION_CODE; KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD (signing).
import { readFileSync, writeFileSync } from 'node:fs';

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
console.log(`Android shell prepared (scheme ${scheme}, version ${name ?? 'unchanged'}, signing ${process.env.KEYSTORE_PATH ? 'on' : 'off'}).`);
