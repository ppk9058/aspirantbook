'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isCapacitorNative } from '@/lib/native/platform';
import { registerPushNotifications } from '@/lib/native/push';

/**
 * NativeAppListener handles Capacitor native lifecycle events:
 * 1. Hardware Back button:
 *    - Exam attempt pages: emits 'nativeExamBack' to show "Leave Examination?" modal
 *    - Root screen: double-press within 2 seconds to exit with toast confirmation
 *    - Other screens: navigates history normally
 * 2. Splash screen auto-hide on app readiness
 * 3. Status bar styling & safe-area classes
 */
export function NativeAppListener() {
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (!isCapacitorNative()) return;

    let isMounted = true;
    let backButtonHandle: any = null;

    async function initNativePlugins() {
      try {
        // 1. Mark body for native styles (e.g. overscroll behavior, safe areas)
        document.body.classList.add('is-native-app');

        // 2. Hide Splash Screen smoothly once UI is mounted
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();

        // 3. Status bar styling
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0F172A' });

        // 4. Listen for Hardware Back button
        const { App } = await import('@capacitor/app');
        backButtonHandle = await App.addListener('backButton', ({ canGoBack }) => {
          const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

          // A. If on exam attempt or assessment screen, trigger in-exam confirmation
          if (pathname.includes('/attempt') || pathname.includes('/assessments/')) {
            window.dispatchEvent(new CustomEvent('nativeExamBack'));
            return;
          }

          // B. Root screens: double-press or confirmation before exiting
          const rootPaths = ['/', '/dashboard', '/courses', '/test-series', '/my-learning', '/books'];
          const isAtRoot = rootPaths.includes(pathname) || !canGoBack;

          if (isAtRoot) {
            const now = Date.now();
            if (now - lastBackPressRef.current < 2000) {
              App.exitApp();
            } else {
              lastBackPressRef.current = now;
              toast.info('Press back again to exit', { duration: 2000 });
            }
            return;
          }

          // C. Normal in-app navigation
          window.history.back();
        });

        // 5. Initialize Push Notifications registration (safe no-op until Firebase configured)
        registerPushNotifications().catch(() => {});
      } catch (err) {
        console.warn('NativeAppListener initialization warning:', err);
      }
    }

    initNativePlugins();

    // Register offline-fallback service worker in production
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    return () => {
      isMounted = false;
      if (backButtonHandle) {
        backButtonHandle.remove();
      }
    };
  }, []);

  return null;
}

export default NativeAppListener;
