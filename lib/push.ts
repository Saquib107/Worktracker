import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const registerLocalNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Local notifications not supported on web/PWA");
    return;
  }

  // Request permissions
  const permStatus = await LocalNotifications.requestPermissions();
  if (permStatus.display !== 'granted') {
    console.error("User denied local notification permissions");
    return;
  }

  // Clear any existing notifications to avoid duplicates
  await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

  // Schedule daily notification at 5:00 PM
  await LocalNotifications.schedule({
    notifications: [
      {
        title: "Work Tracker Reminder",
        body: "Please don't forget to fill out your daily work tracker form!",
        id: 1,
        schedule: { 
          on: {
            hour: 17,
            minute: 0
          },
          allowWhileIdle: true, // Ensures it triggers even in Doze mode
        },
        actionTypeId: "",
        extra: null
      }
    ]
  });
  
  console.log("Daily 5:00 PM local notification scheduled.");
};
