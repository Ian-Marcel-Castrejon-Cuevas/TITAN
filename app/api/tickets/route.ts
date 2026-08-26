import { NextRequest, NextResponse } from "next/server";
import { getSqlConnection, generateTicketId } from "@/lib/db_sqlserver";
import { getRequestUser } from "@/lib/request-auth";
import { logError } from "@/lib/error-log";

/**
 * Obtiene la lista completa de tickets.
 *
 * Parámetros:
 * - `request` (NextRequest): objeto de la petición entrante (no se usan parámetros query actualmente).
 *
 * Retorna:
 * - `NextResponse` con `{ success: true, tickets: Ticket[] }` en caso de éxito.
 * - En errores regresa un JSON con `{ success: false, error: string }` y status 500.
 *
 * Excepciones:
 * - Errores de conexión a la base de datos o consultas SQL (se propagan y se registran en consola).
 *
 * Ejemplo:
 * await fetch('/api/tickets')
 */
export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Sesión requerida" }, { status: 401 });
    }

    const scope = new URL(request.url).searchParams.get("scope") || "all";
    const userRequestsOwnTickets = scope === "mine";
    const pool = await getSqlConnection();
    const dbRequest = pool.request();
    let ownerFilter = "";

    if (!user.es_admin && scope === "all") {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para consultar todos los tickets" },
        { status: 403 },
      );
    }

    if (userRequestsOwnTickets) {
      ownerFilter = "WHERE (creado_por = @user_ch OR (creado_por IS NULL AND ch = @user_ch))";
      dbRequest.input("user_ch", user.ch);
    }

    const result = await dbRequest.query(`
      SELECT 
        ticket_id, ch, nombre, nodo, cartera, plataforma, 
        motivo, puesto, descripcion, estado, 
        fecha_creacion as fecha,
        fecha_actualizacion as updated_at,
        fecha_procesado,
        fecha_resuelto,
        fecha_cerrado,
        creado_por
      FROM tickets
      ${ownerFilter}
      ORDER BY fecha_creacion DESC
    `);

    return NextResponse.json({ success: true, tickets: result.recordset });
  } catch (error) {
    logError("Error al obtener tickets", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener tickets" },
      { status: 500 },
    );
  }
}

/**
 * Crea un nuevo ticket en la base de datos.
 *
 * Parámetros:
 * - `request` (NextRequest): body JSON con campos del ticket: `ch`, `nombre`, `nodo`,
 *   `cartera`, `plataforma`, `motivo`, `puesto`, `descripcion`, y opcional `creado_por`.
 *
 * Retorna:
 * - `NextResponse` con `{ success: true, ticketCode: string }` cuando se crea correctamente.
 * - En errores regresa `{ success: false, error: string }` y status 500.
 *
 * Excepciones:
 * - Errores en la inserción SQL o en la conexión a la BD.
 *
 * Ejemplo:
 * await fetch('/api/tickets', { method: 'POST', body: JSON.stringify(data) })
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const ticketId = generateTicketId();

    const pool = await getSqlConnection();

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input("ch", data.ch)
      .input("nombre", data.nombre)
      .input("nodo", data.nodo)
      .input("cartera", data.cartera)
      .input("plataforma", data.plataforma)
      .input("motivo", data.motivo)
      .input("puesto", data.puesto)
      .input("descripcion", data.descripcion)
      .input("creado_por", data.creado_por || data.ch).query(`
        INSERT INTO tickets (
          ticket_id, ch, nombre, nodo, cartera, plataforma, 
          motivo, puesto, descripcion, estado, 
          fecha_creacion, fecha_actualizacion, creado_por
        ) VALUES (
          @ticket_id, @ch, @nombre, @nodo, @cartera, @plataforma,
          @motivo, @puesto, @descripcion, 'abierto',
          GETDATE(), GETDATE(), @creado_por
        )
      `);

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input("content", `Ticket creado. Motivo: ${data.motivo}`)
      .input("author", "Sistema").query(`
        INSERT INTO ticket_notes (ticket_id, note_type, content, author, tags, fecha_creacion)
        VALUES (@ticket_id, 'creacion', @content, @author, 'creado,sistema', GETDATE())
      `);

    return NextResponse.json({ success: true, ticketCode: ticketId });
  } catch (error) {
    logError("Error al crear ticket", error);
    return NextResponse.json(
      { success: false, error: "Error al crear ticket" },
      { status: 500 },
    );
  }
}
