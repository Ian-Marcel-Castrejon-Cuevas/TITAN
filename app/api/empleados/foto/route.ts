import { NextResponse } from "next/server";
import { getEmpleadoFoto } from "@/lib/db_sqlserver";

/**
 * Obtiene la foto (base64) de un empleado por su `ch`.
 *
 * Parámetros:
 * - `request` (Request): se espera query string `?ch=...`.
 *
 * Retorna:
 * - `NextResponse` con `{ ch, foto_base64 }` o error 400 si falta `ch`.
 *
 * Excepciones:
 * - Propaga/registrar errores al obtener la foto desde SQL Server a través de `getEmpleadoFoto`.
 *
 * Ejemplo:
 * await fetch('/api/empleados/foto?ch=A123')
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ch = searchParams.get("ch");

  if (!ch) {
    return NextResponse.json({ error: "CH requerido" }, { status: 400 });
  }

  try {
    const foto = await getEmpleadoFoto(ch);
    return NextResponse.json({
      ch: foto?.ch || ch,
      foto_base64: foto?.foto_base64 || null,
    });
  } catch (error) {
    console.error("Error al obtener foto:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
