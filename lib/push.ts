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

  // Cancel previously set single notifications to replace with weekday specific ones
  await LocalNotifications.cancel({ notifications: Array.from({length: 10}, (_, i) => ({ id: i + 1 })) });

  // Schedule notifications for Monday (2) to Saturday (7)
  const notificationsToSchedule = [2, 3, 4, 5, 6, 7].map((weekday, index) => ({
    title: "Work Tracker Reminder",
    body: "Please don't forget to fill out your daily work tracker form!",
    id: index + 1, // IDs 1 to 6
    schedule: { 
      on: {
        weekday: weekday,
        hour: 17,
        minute: 0
      },
      repeats: true,
      allowWhileIdle: true, // Ensures it triggers even in Doze mode
    },
    actionTypeId: "",
    extra: null
  }));

  await LocalNotifications.schedule({
    notifications: notificationsToSchedule
  });
  
  console.log("Daily 5:00 PM local notification scheduled.");
};
