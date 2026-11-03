import { apiClient } from '../api/client';
import { isNative } from './native';

/**
 * Native APK fallback (OTA spec section 4). Asks the backend whether the
 * installed Android shell is behind. Returns { latestVersion, apkUrl } when
 * a newer APK is available, otherwise null. Never throws.
 */
export async function checkNativeUpdate() {
  if (!isNative()) return null;
  try {
    const { App } = await import('@capacitor/app');
    const { version } = await App.getInfo();
    const { data } = await apiClient.get('/app/version', { params: { current: version } });
    return data.updateAvailable && data.apkUrl ? { latestVersion: data.latestVersion, apkUrl: data.apkUrl } : null;
  } catch {
    return null;
  }
}

export async function openApkDownload(url) {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
}
