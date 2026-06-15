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
          disableContextMenu: true,
          disableDevToolsShortcut: true,
          disableSelection: true,
          disableCopy: true,
          disableCut: true,
          disablePaste: false,
          redirectOnInspect: false,
          debug: false,
          onInspectAttempt: () => {
            console.warn("Intento de inspección bloqueado");
          },
        });
      })
      .catch((err) => console.error("Error cargando block-inspect:", err));
  }, []);

  return <>{children}</>;
}
