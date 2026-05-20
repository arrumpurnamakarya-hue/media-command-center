"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

type ContentPayload = {
  id?: string;
  title?: string;
  prod_status?: string;
  pub_status?: string;
  publish_time?: string;
  publish_date?: string;
};

const SOUND_PATH = "/notify.mp3";

export default function DesktopNotificationBridge() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundUnlockedRef = useRef(false);

  useEffect(() => {
    audioRef.current = new Audio(SOUND_PATH);
    audioRef.current.volume = 0.85;

    const unlockSound = async () => {
      if (soundUnlockedRef.current || !audioRef.current) return;

      try {
        audioRef.current.muted = true;
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
        soundUnlockedRef.current = true;
      } catch {
        // Browser/Electron kadang butuh interaksi user dulu.
      }
    };

    window.addEventListener("click", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });

    return () => {
      window.removeEventListener("click", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const playSound = async () => {
      try {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      } catch {
        console.warn("Suara notifikasi belum bisa diputar. Klik aplikasi dulu untuk mengaktifkan audio.");
      }
    };

    const showDesktopNotification = async (
      title: string,
      message: string
    ) => {
      await playSound();

      if (!("Notification" in window)) return;

      if (Notification.permission === "granted") {
        const notif = new Notification(title, {
          body: message,
          icon: "/logo.png",
          badge: "/logo.png",
          tag: "media-command-center",
          requireInteraction: false,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    };

    const channel = supabase
      .channel("desktop-notification-bridge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contents",
        },
        async (payload) => {
          const content = payload.new as ContentPayload;

          await showDesktopNotification(
            "Konten Baru Masuk",
            content?.title
              ? `${content.title}`
              : "Ada konten baru di Media Command Center."
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contents",
        },
        async (payload) => {
          const content = payload.new as ContentPayload;
          const oldContent = payload.old as ContentPayload;

          if (content?.prod_status === oldContent?.prod_status) return;

          if (content?.prod_status === "Ready to Post") {
            await showDesktopNotification(
              "Konten Siap Posting",
              content?.title
                ? `${content.title} sudah siap posting.`
                : "Ada konten yang sudah siap posting."
            );
          }

          if (content?.prod_status === "Editing/Design") {
            await showDesktopNotification(
              "Masuk Dapur Visual",
              content?.title
                ? `${content.title} masuk tahap editing/desain.`
                : "Ada konten masuk dapur visual."
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}