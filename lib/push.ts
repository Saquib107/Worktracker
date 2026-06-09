import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const registerPushNotifications = async () => {
  // Only execute in native environment (Android/iOS)
  if (!Capacitor.isNativePlatform()) {
    console.log("Push notifications not supported on web/PWA yet");
    return;
  }

  // Request permission to use push notifications
  // iOS will prompt user and return if they granted permission or not
  // Android will just grant without prompting
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.error("User denied push notification permissions");
    return;
  }

  // Register with Apple / Google to receive push via APNS/FCM
  await PushNotifications.register();

  // Listeners for registration and notifications
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token: ' + token.value);
    // TODO: Send token to your backend to save it for the user
  });

  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      // TODO: Handle foreground notifications (e.g., show a toast)
    },
  );

  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      // TODO: Handle user tapping on notification (e.g., navigate to specific report)
    },
  );
};
