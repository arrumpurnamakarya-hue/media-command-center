'use client';

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

// Mengimpor file Supabase
import { supabase } from './lib/supabaseClient';

export default function PushSetup() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setupPush();
    }
  }, []);

  const setupPush = async () => {
    try {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        await PushNotifications.register();
      }

      PushNotifications.addListener('registration', async (token) => {
        // --- KODE DETEKTIF ---
        try {
          const { error } = await supabase
            .from('fcm_tokens')
            .upsert({ token: token.value }, { onConflict: 'token' });
          
          if (error) {
            // Memaksa HP menampilkan alasan kenapa Supabase menolak datanya
            alert('Gagal simpan ke Supabase: ' + error.message); 
          } else {
            // Memunculkan pesan sukses di layar HP
            alert('Sukses! Token berhasil masuk ke Database!'); 
          }
        } catch (err: any) {
          alert('Error Jaringan/Kode: ' + err.message);
        }
        // ----------------------
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notifikasi masuk: ', notification.title);
      });
      
    } catch (error) {
      console.error('Error setup notifikasi:', error);
    }
  };

  return null;
}