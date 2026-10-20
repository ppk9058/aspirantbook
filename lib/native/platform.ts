import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    __IS_NATIVE_APP__?: boolean;
  }
}

/**
 * Checks if running inside Capacitor native platform directly.
 */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

/**
 * Checks if the current context is inside the native app.
 * Detects via:
 * 1. Capacitor.isNativePlatform()
 * 2. window.__IS_NATIVE_APP__
 * 3. URL query param `?app=1`
 * 4. User-Agent marker containing `AspirantBookApp`
 * 5. Persistent cookie or sessionStorage `is_native_app=1`
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // 1. Explicit global flag
  if (window.__IS_NATIVE_APP__ === true) {
    return true;
  }

  // 2. Capacitor native platform
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
  } catch {
    // Ignore error if capacitor core not initialized
  }

  // 3. User-Agent marker
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    if (navigator.userAgent.includes('AspirantBookApp')) {
      return true;
    }
  }

  // 4. URL query param ?app=1
  try {
    if (window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('app') === '1') {
        // Persist marker for subpages
        try {
          sessionStorage.setItem('is_native_app', '1');
          document.cookie = 'is_native_app=1; path=/; max-age=86400; SameSite=Lax';
        } catch {}
        return true;
      }
    }
  } catch {}

  // 5. SessionStorage marker
  try {
    if (sessionStorage.getItem('is_native_app') === '1') {
      return true;
    }
  } catch {}

  // 6. Cookie marker
  try {
    if (document.cookie && /(?:^|;\s*)is_native_app=1/.test(document.cookie)) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Returns current platform: 'android', 'ios', or 'web'.
 */
export function getNativePlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') {
    return platform;
  }
  return 'web';
}

/**
 * Server-side check for native app from request headers or cookies.
 */
export function isNativeAppServer(headers: Headers, cookies?: { get: (name: string) => { value: string } | undefined }): boolean {
  const ua = headers.get('user-agent') || '';
  if (ua.includes('AspirantBookApp')) {
    return true;
  }
  const xNative = headers.get('x-is-native-app');
  if (xNative === '1') {
    return true;
  }
  if (cookies) {
    const cookie = cookies.get('is_native_app');
    if (cookie?.value === '1') {
      return true;
    }
  }
  return false;
}
