"use client";

import { useEffect, useRef } from "react";

interface NotificationSoundProps {
  play: boolean;
  onPlay?: () => void;
}

const sounds = [
  "/sonidos/AMONG US.mp3",
  "/sonidos/CARRERITAS.mp3",
  "/sonidos/DISPARO.mp3",
  "/sonidos/GANADOR.mp3",
  "/sonidos/NIVEL COMPLETO.mp3",
  "/sonidos/PHONE.mp3",
  "/sonidos/XPMINECRAFT.mp3",
];

export function NotificationSound({ play, onPlay }: NotificationSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayTime = useRef<number>(0);

  useEffect(() => {
    if (play) {
      const now = Date.now();
      if (now - lastPlayTime.current < 2000) {
        return;
      }
      lastPlayTime.current = now;

      const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = randomSound;
        audioRef.current.load();
        audioRef.current.play().catch((error) => {
          console.log("Error reproduciendo sonido:", error);
        });
      }

      if (onPlay) onPlay();
    }
  }, [play, onPlay]);

  return (
    <audio ref={audioRef} preload="auto">
      <source src="/sonidos/NIVEL COMPLETO.mp3" type="audio/mpeg" />
    </audio>
  );
}
