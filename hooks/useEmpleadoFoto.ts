import { useState, useEffect } from "react";

export function useEmpleadoFoto(ch: string | undefined) {
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!ch || ch === "undefined" || ch === "null" || ch === "CH00000") {
      setCargando(false);
      return;
    }

    const fetchFoto = async () => {
      try {
        const response = await fetch(
          `/api/empleados/foto?ch=${encodeURIComponent(ch)}`,
        );
        const data = await response.json();

        if (response.ok && data.foto_base64) {
          setFotoBase64(data.foto_base64);
        }
      } catch (err) {
        console.error("Error fetching foto:", err);
      } finally {
        setCargando(false);
      }
    };

    fetchFoto();
  }, [ch]);

  return { fotoBase64, cargando };
}
