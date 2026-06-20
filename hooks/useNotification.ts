"use client";

import { useState, useCallback, useRef } from "react";

interface NotificationData {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  duration?: number;
  playSound?: boolean;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSoundTime = useRef<number>(0);

  const sounds = [
    "/sonidos/AMONG US.mp3",
    "/sonidos/CARRERITAS.mp3",
    "/sonidos/DISPARO.mp3",
    "/sonidos/GANADOR.mp3",
    "/sonidos/NIVEL COMPLETO.mp3",
    "/sonidos/PHONE.mp3",
    "/sonidos/XPMINECRAFT.mp3",
    "/sonidos/doh.mp3",
  ];

  const playSound = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTime.current < 2000) return;
    lastSoundTime.current = now;

    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = randomSound;
      audioRef.current.load();
      audioRef.current.play().catch((err) => console.log("Audio error:", err));
    } else {
      const audio = new Audio(randomSound);
      audio.play().catch((err) => console.log("Audio error:", err));
      audioRef.current = audio;
    }
  }, []);

  const showNotification = useCallback(
    (
      type: NotificationData["type"],
      title: string,
      message: string,
      options?: { duration?: number; playSound?: boolean },
    ) => {
      const id = Date.now().toString();
      const { duration = 5000, playSound: shouldPlaySound = true } =
        options || {};

      if (shouldPlaySound) {
        playSound();
      }

      setNotifications((prev) => [
        ...prev,
        { id, type, title, message, duration },
      ]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);

      return id;
    },
    [playSound],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback(
    (
      title: string,
      message: string,
      options?: { duration?: number; playSound?: boolean },
    ) => {
      return showNotification("success", title, message, options);
    },
    [showNotification],
  );

  const error = useCallback(
    (
      title: string,
      message: string,
      options?: { duration?: number; playSound?: boolean },
    ) => {
      return showNotification("error", title, message, options);
    },
    [showNotification],
  );

  const info = useCallback(
    (
      title: string,
      message: string,
      options?: { duration?: number; playSound?: boolean },
    ) => {
      return showNotification("info", title, message, options);
    },
    [showNotification],
  );

  const warning = useCallback(
    (
      title: string,
      message: string,
      options?: { duration?: number; playSound?: boolean },
    ) => {
      return showNotification("warning", title, message, options);
    },
    [showNotification],
  );

  return {
    notifications,
    showNotification,
    removeNotification,
    success,
    error,
    info,
    warning,
    playSound,
  };
}
