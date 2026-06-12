"use client";

import Image from "next/image";

interface ProfilePhotoProps {
  nombre?: string;
  fotoBase64?: string | null;
  size?: number;
}

export function ProfilePhoto({
  nombre,
  fotoBase64,
  size = 48,
}: ProfilePhotoProps) {
  const getInitials = () => {
    if (!nombre || nombre === "undefined" || nombre === "null") {
      return "U";
    }
    return nombre.trim()[0].toUpperCase();
  };

  // Si hay foto, mostrarla
  if (fotoBase64) {
    return (
      <div
        className="relative rounded-full overflow-hidden bg-gradient-to-r from-primary-500 to-primary-600 flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={fotoBase64}
          alt={`Foto de ${nombre || "usuario"}`}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  // Fallback: iniciales
  return (
    <div
      className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-bold text-lg">{getInitials()}</span>
    </div>
  );
}
