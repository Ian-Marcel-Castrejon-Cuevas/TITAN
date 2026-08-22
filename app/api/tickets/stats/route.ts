import { NextResponse } from "next/server";
import { getSqlConnection } from "@/lib/db_sqlserver";

interface EstadoRow {
  estado: string;
  cantidad: number;
}

export async function GET() {
  /**
   * Calcula estadísticas de tickets: total, por estado y tickets del día.
   *
   * Retorna:
   * - `NextResponse` con `{ success: true, stats: { total_tickets, tickets_hoy, por_estado } }`.
   *
   * Excepciones:
   * - Propaga errores de conexión/consulta a SQL Server y devuelve status 500.
   *
   * Ejemplo:
   * await fetch('/api/tickets/stats')
   */
  
  try {
    const pool = await getSqlConnection();

    const totalResult = await pool
      .request()
      .query("SELECT COUNT(*) as total FROM tickets");
    const total = totalResult.recordset[0].total;

    const estadoResult = await pool.request().query(`
      SELECT estado, COUNT(*) as cantidad 
      FROM tickets 
      GROUP BY estado
    `);

    const por_estado: Record<string, number> = {};
    estadoResult.recordset.forEach((row: EstadoRow) => {
      por_estado[row.estado] = row.cantidad;
    });

    const hoyResult = await pool.request().query(`
      SELECT COUNT(*) as hoy 
      FROM tickets 
      WHERE CAST(DATEADD(HOUR, -6, fecha_creacion) AS DATE) = CAST(DATEADD(HOUR, -6, GETUTCDATE()) AS DATE)
    `);
    const tickets_hoy = hoyResult.recordset[0].hoy;

    return NextResponse.json({
      success: true,
      stats: {
        total_tickets: total,
        tickets_hoy: tickets_hoy,
        por_estado,
      },
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener estadísticas" },
      { status: 500 },
    );
  }
}
