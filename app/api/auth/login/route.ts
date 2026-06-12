import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.8.87:5001";

export async function POST(request: NextRequest) {
  try {
    const { usuario_ch, password } = await request.json();

    console.log("📝 Login intento para usuario:", usuario_ch);

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

    console.log("✅ Login exitoso para:", usuario_ch);

    return NextResponse.json({
      success: true,
      token: data.token,
      usuario_ch: data.usuario_ch,
      nombre_completo: data.nombre_completo,
      llave: data.llave,
    });
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
