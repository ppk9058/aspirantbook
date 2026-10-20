import { isCapacitorNative } from './platform';

/**
 * Registers device with PushNotifications plugin.
 * Safe no-op until Firebase google-services.json and FCM keys exist.
 */
export async function registerPushNotifications(): Promise<void> {
  if (typeof window === 'undefined' || !isCapacitorNative()) {
    return;
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      const requestResult = await PushNotifications.requestPermissions();
      if (requestResult.receive !== 'granted') {
        return;
      }
    } else if (permStatus.receive !== 'granted') {
      return;
    }

    // Register with APNs / FCM
    await PushNotifications.register();

    // Listen for registration token
    await PushNotifications.addListener('registration', async (token) => {
      try {
        await fetch('/api/user/push-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: 'android',
          }),
        });
      } catch {}
    });

    await PushNotifications.addListener('registrationError', (error) => {
      // Expected no-op when Firebase credentials are not yet bundled
      console.warn('Push notification registration pending Firebase config:', error?.error);
    });
  } catch (err) {
    // Expected no-op if push notifications plugin not initialized
    console.warn('Push notifications not ready:', err);
  }
}
