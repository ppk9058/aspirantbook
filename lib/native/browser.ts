import { Browser } from '@capacitor/browser';
import { isNativeApp } from './platform';

/**
 * Opens an external URL in the system browser when in native app,
 * or in a new window/tab in standard web browser.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const targetUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

  if (isNativeApp()) {
    try {
      await Browser.open({ url: targetUrl });
      return;
    } catch {
      // Fallback if Capacitor Browser plugin encounters an issue
    }
  }

  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
