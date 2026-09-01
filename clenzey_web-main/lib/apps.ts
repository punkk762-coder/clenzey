export const APP_STORE_URL =
  'https://apps.apple.com/app/clenzey/id0000000000';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.clenzey.app';

export type MobilePlatform = 'ios' | 'android' | 'other';

export function getMobilePlatform(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): MobilePlatform {
  const ua = userAgent.toLowerCase();

  if (/iphone|ipod/.test(ua)) return 'ios';
  if (/ipad/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';

  // iPadOS 13+ may identify as Mac
  if (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return 'ios';
  }

  return 'other';
}

export function getAppStoreUrl(platform: MobilePlatform): string {
  if (platform === 'ios') return APP_STORE_URL;
  if (platform === 'android') return PLAY_STORE_URL;
  return PLAY_STORE_URL;
}

export function openAppStore(platform?: MobilePlatform): void {
  const resolved = platform ?? getMobilePlatform();
  const url = getAppStoreUrl(resolved);
  window.open(url, '_blank', 'noopener,noreferrer');
}
