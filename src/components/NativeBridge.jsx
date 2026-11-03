import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Banner } from './ui/Feedback';
import Button from './ui/Button';
import { isNative, routeFromDeepLink } from '../lib/native';
import { applyPendingBundle, checkForBundleUpdate } from '../lib/ota';
import { checkNativeUpdate, openApkDownload } from '../lib/nativeUpdate';
import { useNativePush } from '../hooks/useNativePush';

const DISMISS_KEY = 'guessio_apk_prompt_dismissed';
const readDismissed = () => {
  try { return sessionStorage.getItem(DISMISS_KEY); } catch { return null; }
};

/**
 * Everything that only exists inside the Android app: Google sign-in returning
 * through the io.guessio.app:// link, the once-per-launch OTA bundle check, push
 * notification taps, and the non-blocking "new APK" prompt. Renders nothing in a browser.
 */
export default function NativeBridge() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [apk, setApk] = useState(null);
  useNativePush();

  useEffect(() => {
    if (!isNative()) return undefined;
    let handle;
    let cancelled = false;
    const seen = new Set();
    const open = async (url) => {
      if (seen.has(url)) return;
      seen.add(url);
      const target = routeFromDeepLink(url);
      if (!target) return;
      try { (await import('@capacitor/browser')).Browser.close(); } catch { /* the sign-in tab may already be closed */ }
      navigate(target, { replace: true });
    };
    (async () => {
      const { App } = await import('@capacitor/app');
      const sub = await App.addListener('appUrlOpen', (event) => open(event.url));
      if (cancelled) { sub.remove(); return; }
      handle = sub;
      const launch = await App.getLaunchUrl();
      if (launch?.url) open(launch.url);
    })();

    checkForBundleUpdate();
    checkNativeUpdate().then((found) => {
      if (found && readDismissed() !== found.latestVersion) setApk(found);
    });
    return () => { cancelled = true; handle?.remove(); };
  }, [navigate]);

  useEffect(() => { applyPendingBundle(pathname); }, [pathname]);

  // Never interrupt a match with the prompt.
  if (!apk || pathname.startsWith('/gameplay')) return null;
  const later = () => {
    try { sessionStorage.setItem(DISMISS_KEY, apk.latestVersion); } catch { /* shown again next launch */ }
    setApk(null);
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] space-y-2 p-4">
      <Banner variant="info">A new version of guessIo is available ({apk.latestVersion}).</Banner>
      <Button onClick={() => openApkDownload(apk.apkUrl)}>Download update</Button>
      <Button variant="text" onClick={later}>Later</Button>
    </div>
  );
}
