import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PG_HOST || "192.168.8.55",
  port: parseInt(process.env.PG_PORT || "5432"),
  user: process.env.PG_USER || "asecon",
  password: process.env.PG_PASSWORD || "",
  database: process.env.PG_DATABASE || "asecon",
  ssl: false,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ch = searchParams.get("ch");

    if (!ch) {
      return NextResponse.json(
        { success: false, error: "CH requerido" },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    const result = await client.query(
      `SELECT 
        emausuariocarven as ch,
        CONCAT(
          COALESCE(emanombre, ''),
          CASE WHEN emanombre IS NOT NULL AND (emaappaterno IS NOT NULL OR emaapmaterno IS NOT NULL) THEN ' ' ELSE '' END,
          COALESCE(emaappaterno, ''),
          CASE WHEN emaappaterno IS NOT NULL AND emaapmaterno IS NOT NULL THEN ' ' ELSE '' END,
          COALESCE(emaapmaterno, '')
        ) as nombre_completo
       FROM tbempleados 
       WHERE emausuariocarven = $1`,
      [ch.toUpperCase()],
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, usuario: null });
    }

    const usuario = result.rows[0];

    const nombreCompleto = usuario.nombre_completo.replace(/\s+/g, " ").trim();

    return NextResponse.json({
      success: true,
      usuario: {
        ch: usuario.ch,
        nombre_completo: nombreCompleto,
      },
    });
  } catch (error) {
    console.error("Error buscando usuario:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
