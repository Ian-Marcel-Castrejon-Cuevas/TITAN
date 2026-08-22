import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session-store";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.8.4:5001";

export async function POST(request: NextRequest) {
  /**
   * Proxy de autenticación que reenvía credenciales al backend Python.
   *
   * Parámetros:
   * - `request` (NextRequest): body JSON con `usuario_ch` y `password`.
   *
   * Retorna:
   * - `NextResponse` con `{ success: true, token, usuario_ch, nombre_completo, llave }` en caso de éxito.
   * - Si faltan campos retorna status 400.
   * - Si el backend responde con error reenvía el error correspondiente.
   *
   * Excepciones:
   * - Captura errores de red y devuelve status 500 con mensaje genérico.
   *
   * Seguridad:
   * - Maneja credenciales sensibles; asegurar transporte TLS y no loguear contraseñas en producción.
   */
  try {
    const { usuario_ch, password } = await request.json();

    if (!usuario_ch || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 },
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_ch, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("❌ Error desde backend:", data.error);
      return NextResponse.json(
        { error: data.error || "Error en autenticación" },
        { status: response.status },
      );
    }

    const sessionId = createSession({
      ch: data.usuario_ch,
      nombre: data.nombre_completo,
      departamento: data.departamento,
      es_admin: data.es_admin,
    });

    const result = NextResponse.json({
      success: true,
      token: data.token,
      usuario_ch: data.usuario_ch,
      nombre_completo: data.nombre_completo,
      departamento: data.departamento,
      es_admin: data.es_admin,
      llave: data.llave,
    });
    result.cookies.set("titan_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return result;
  } catch (error) {
    console.error("❌ Error en login:", error);
    return NextResponse.json(
      {
        error:
          "Error interno del servidor: " +
          (error instanceof Error ? error.message : "Desconocido"),
      },
      { status: 500 },
    );
  }
}
