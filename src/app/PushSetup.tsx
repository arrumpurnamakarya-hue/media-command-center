'use client';

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

async function setupPush() {
  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }

    PushNotifications.addListener('registration', async (token) => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const response = await fetch(`${apiBaseUrl}/api/save-fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token.value,
            device_name: 'Android Device',
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Gagal menyimpan token FCM');
        }

        console.log('Token FCM berhasil dikirim ke backend');
      } catch (error) {
        console.error('Gagal menyimpan token FCM ke backend:', error);
      }
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notifikasi masuk: ', notification.title);
    });
  } catch (error) {
    console.error('Error setup notifikasi:', error);
  }
}

export default function PushSetup() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setupPush();
    }
  }, []);

  return null;
}
