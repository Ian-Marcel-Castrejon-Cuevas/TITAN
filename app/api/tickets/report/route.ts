import { NextRequest, NextResponse } from "next/server";
import { getSqlConnection } from "@/lib/db_sqlserver";
import { getDemoReport, isDemoMode } from "@/lib/demo-store";

export async function POST(request: NextRequest) {
  /**
   * Genera un reporte de tickets entre dos fechas.
   *
   * Parámetros:
   * - `request` (NextRequest): body JSON con `{ fechaInicio, fechaFin }` (formato YYYY-MM-DD esperado).
   *
   * Retorna:
   * - `NextResponse` con `{ success: true, tickets: Ticket[], total: number }` en caso de éxito.
   * - En errores regresa `{ success: false, error: string }` y status 500.
   *
   * Excepciones:
   * - Errores en la ejecución de la consulta SQL.
   *
   * Ejemplo:
   * await fetch('/api/tickets/report', { method: 'POST', body: JSON.stringify({ fechaInicio: '2024-01-01', fechaFin: '2024-01-31' }) })
   */
  try {
    const { fechaInicio, fechaFin } = await request.json();

    if (isDemoMode()) {
      const tickets = getDemoReport(fechaInicio, fechaFin);
      return NextResponse.json({ success: true, tickets, total: tickets.length });
    }

    const pool = await getSqlConnection();

    const result = await pool
      .request()
      .input("fechaInicio", fechaInicio)
      .input("fechaFin", fechaFin).query(`
        SELECT 
          t.ticket_id, 
          t.ch, 
          t.nombre, 
          t.nodo, 
          t.cartera, 
          t.plataforma, 
          t.motivo, 
          t.puesto, 
          t.descripcion, 
          t.estado, 
          -- FECHAS DIRECTAMENTE DE LA TABLA TICKETS SIN MODIFICAR
          t.fecha_creacion as fecha,
          t.fecha_procesado,
          t.fecha_resuelto,
          t.fecha_cerrado,
          t.creado_por,
          -- NOMBRES DE QUIEN ATENDIÓ DESDE TICKET_NOTES
          (SELECT TOP 1 
              LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(author, '  ', ' '), '  ', ' '), '  ', ' '))) 
           FROM ticket_notes 
           WHERE ticket_id = t.ticket_id AND content LIKE '%En Proceso%' 
           ORDER BY fecha_creacion ASC) as procesado_por,
          (SELECT TOP 1 
              LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(author, '  ', ' '), '  ', ' '), '  ', ' '))) 
           FROM ticket_notes 
           WHERE ticket_id = t.ticket_id AND content LIKE '%Resuelto%' 
           ORDER BY fecha_creacion ASC) as resuelto_por,
          (SELECT TOP 1 
              LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(author, '  ', ' '), '  ', ' '), '  ', ' '))) 
           FROM ticket_notes 
           WHERE ticket_id = t.ticket_id AND content LIKE '%Cerrado%' 
           ORDER BY fecha_creacion ASC) as atendido_por
        FROM tickets t
        WHERE CAST(t.fecha_creacion AS DATE) BETWEEN @fechaInicio AND @fechaFin
        ORDER BY t.fecha_creacion DESC
      `);

    return NextResponse.json({
      success: true,
      tickets: result.recordset,
      total: result.recordset.length,
    });
  } catch (error) {
    console.error("Error al generar reporte:", error);
    return NextResponse.json(
      { success: false, error: "Error al generar reporte" },
      { status: 500 },
    );
  }
}
