// app/components/SecurityWrapper.tsx
"use client";

import { useEffect } from "react";

export default function SecurityWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    import("block-inspect")
      .then((blockInspect) => {
        const defaultBlock = blockInspect.default || blockInspect;
        defaultBlock({
          disableContextMenu: true, // Desactiva clic derecho
          disableDevToolsShortcut: true, // Bloquea F12 y atajos
          disableSelection: true, // Desactiva selección de texto
          disableCopy: true, // Bloquea copia
          disableCut: true, // Bloquea cortar
          disablePaste: false, // Permite pegar (útil para formularios)
          redirectOnInspect: false, // No redirige
          debug: false, // No logs
          onInspectAttempt: () => {
            console.warn("Intento de inspección bloqueado");
          },
        });
      })
      .catch((err) => console.error("Error cargando block-inspect:", err));
  }, []);

  return <>{children}</>;
}
