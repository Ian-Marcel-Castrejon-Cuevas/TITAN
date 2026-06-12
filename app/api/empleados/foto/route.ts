import { NextResponse } from "next/server";
import { getEmpleadoFoto } from "@/lib/db_sqlserver";

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
