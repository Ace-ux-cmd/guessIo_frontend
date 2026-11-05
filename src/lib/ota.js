import { isNative } from './native';
import { APP_VERSION, compareVersions } from './version';

/**
 * Live bundle updates (OTA spec section 3). The plugin runs in manual mode so
 * the app decides when a new bundle takes effect:
 *   - the check happens once per launch (pull-based, section 2.1);
 *   - a downloaded bundle is applied at once only on a lobby screen, otherwise
 *     it is queued for the next launch, so a swap never lands mid-match (3.5).
 * Releases come from GitHub: the latest non-prerelease holds bundle.zip, and its
 * name is the bundle version (see .github/workflows/release-bundle.yml).
 */
// CI supplies this for forks, while the production app keeps working when an
// APK is built locally without environment variables.
const REPO = import.meta.env.VITE_OTA_REPO || 'Ace-ux-cmd/guessIo_frontend';
const SAFE_ROUTES = new Set(['/', '/login', '/dashboard', '/guest-home']);

let pending = null; // a downloaded bundle waiting for a safe screen
let checked = false;

async function updater() {
  return (await import('@capgo/capacitor-updater')).CapacitorUpdater;
}

/** Call once the UI has rendered. If this never runs, the plugin rolls the app back to the previous bundle. */
export async function markBundleHealthy() {
  if (!isNative()) return;
  try {
    const CapacitorUpdater = await updater();
    await CapacitorUpdater.notifyAppReady();
    const { bundles } = await CapacitorUpdater.list();
    const { bundle: current } = await CapacitorUpdater.current();
    // Old bundles are kept only until the new one has proven itself.
    await Promise.all(bundles.filter((b) => b.id !== current.id && b.id !== 'builtin' && (b.status === 'success' || b.status === 'error')).map((b) => CapacitorUpdater.delete({ id: b.id }).catch(() => {})));
  } catch {
    // An updater failure must never stop the game from running.
  }
}

async function latestRelease() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[OTA] GitHub release check failed (${res.status}).`);
      return null;
    }
    const release = await res.json();
    const asset = (release.assets || []).find((a) => a.name === 'bundle.zip');
    const version = String(release.name || '').trim();
    return asset && /^\d+\.\d+\.\d+$/.test(version) ? { version, url: asset.browser_download_url } : null;
  } finally {
    clearTimeout(timer);
  }
}

/** Checks for a newer bundle and downloads it. Safe to call on every launch; runs once. */
export async function checkForBundleUpdate() {
  if (!isNative() || !REPO || checked) return;
  checked = true;
  try {
    const release = await latestRelease();
    if (!release || compareVersions(APP_VERSION, release.version) >= 0) return;
    const CapacitorUpdater = await updater();
    const bundle = await CapacitorUpdater.download({ url: release.url, version: release.version });
    // Judged when the download finishes, not when it started: the player may have moved on.
    if (SAFE_ROUTES.has(window.location.pathname)) {
      await CapacitorUpdater.set(bundle); // reloads into the new bundle
    } else {
      pending = bundle;
      await CapacitorUpdater.next(bundle); // otherwise applies on the next launch
    }
  } catch (error) {
    // Offline, rate-limited or a bad download: stay on the current bundle and try next launch.
    console.warn('[OTA] Bundle update was not applied.', error);
  }
}

/** Called on every route change: applies a queued bundle as soon as the player reaches a lobby screen. */
export async function applyPendingBundle(pathname) {
  if (!pending || !SAFE_ROUTES.has(pathname)) return;
  const bundle = pending;
  pending = null;
  try {
    await (await updater()).set(bundle);
  } catch {
    // It still applies on the next launch.
  }
}
