import { NextRequest, NextResponse } from "next/server";
import { getSqlConnection, generateTicketId } from "@/lib/db_sqlserver";
import { getRequestUser } from "@/lib/request-auth";
import { logError } from "@/lib/error-log";
import { createDemoTicket, isDemoMode, listDemoTickets } from "@/lib/demo-store";
import {
  acquireCarvenOperation,
  getCarvenOperation,
  releaseCarvenOperation,
} from "@/lib/carven-operation-locks";

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

    const searchParams = new URL(request.url).searchParams;
    const scope = searchParams.get("scope") || "all";
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim() || "";
    const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const requestedPageSize = Number.parseInt(searchParams.get("pageSize") || "100", 10);
    const isPaginated = Boolean(status || search);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const pageSize = isPaginated
      ? Math.min(100, Math.max(1, Number.isFinite(requestedPageSize) ? requestedPageSize : 100))
      : 0;
    const userRequestsOwnTickets = scope === "mine";

    if (!user.es_admin && scope === "all") {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para consultar todos los tickets" },
        { status: 403 },
      );
    }

    if (isDemoMode()) {
      const tickets = listDemoTickets(user, { scope, status, search });
      if (isPaginated) {
        const start = (page - 1) * pageSize;
        return NextResponse.json({
          success: true,
          tickets: tickets.slice(start, start + pageSize),
          pagination: {
            page,
            pageSize,
            total: tickets.length,
            totalPages: Math.ceil(tickets.length / pageSize),
          },
        });
      }
      return NextResponse.json({ success: true, tickets });
    }

    const pool = await getSqlConnection();
    const dbRequest = pool.request();
    const filters: string[] = [];

    if (userRequestsOwnTickets) {
      filters.push("(creado_por = @user_ch OR (creado_por IS NULL AND ch = @user_ch))");
      dbRequest.input("user_ch", user.ch);
    }

    if (status) {
      const validStatuses = ["abierto", "en_proceso", "resuelto", "cerrado"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: "Estado de ticket no válido" },
          { status: 400 },
        );
      }
      filters.push("estado = @status");
      dbRequest.input("status", status);
    }

    if (search) {
      filters.push(
        "(ticket_id LIKE @search OR motivo LIKE @search OR descripcion LIKE @search OR nombre LIKE @search OR ch LIKE @search)",
      );
      dbRequest.input("search", `%${search}%`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const baseQuery = `
      FROM tickets
      ${whereClause}
    `;

    if (isPaginated) {
      const countResult = await dbRequest.query(`SELECT COUNT(*) AS total ${baseQuery}`);
      const total = Number(countResult.recordset[0]?.total || 0);
      dbRequest.input("offset", (page - 1) * pageSize);
      dbRequest.input("pageSize", pageSize);

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
        ${baseQuery}
        ORDER BY fecha_creacion DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

      return NextResponse.json({
        success: true,
        tickets: result.recordset,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
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
      ${whereClause}
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
  let operation: ReturnType<typeof getCarvenOperation> = null;
  let operationOwner = "";

  try {
    const data = await request.json();
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sesión requerida" },
        { status: 401 },
      );
    }

    operation = getCarvenOperation(data.motivo);
    if (operation) {
      operationOwner = user.ch;
      const lockResult = acquireCarvenOperation(
        operation,
        user.ch,
        user.nombre,
      );
      if (!lockResult.acquired) {
        return NextResponse.json(
          {
            success: false,
            error: `No se puede levantar Carven${operation.slice(-1)} porque ya lo levantó ${lockResult.lock.ownerName}.`,
          },
          { status: 409 },
        );
      }
    }

    const ticketId = generateTicketId();
    const isCarvenOperation = [
      "Botar Carven",
      "Levantar Carven1",
      "Levantar Carven2",
      "Levantar carven 3",
    ].includes(data.motivo);
    const estadoInicial = isCarvenOperation ? "cerrado" : "abierto";

    if (isDemoMode()) {
      return NextResponse.json({
        success: true,
        ticketCode: createDemoTicket(data, user),
      });
    }

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
      .input("creado_por", data.creado_por || data.ch)
      .input("estado", estadoInicial)
      .input("atendido_por", isCarvenOperation ? "Sistema" : null).query(`
        INSERT INTO tickets (
          ticket_id, ch, nombre, nodo, cartera, plataforma, 
          motivo, puesto, descripcion, estado, 
          fecha_creacion, fecha_actualizacion, fecha_cerrado, creado_por,
          atendido_por
        ) VALUES (
          @ticket_id, @ch, @nombre, @nodo, @cartera, @plataforma,
          @motivo, @puesto, @descripcion, @estado,
          GETDATE(), GETDATE(),
          CASE WHEN @estado = 'cerrado' THEN GETDATE() ELSE NULL END,
          @creado_por, @atendido_por
        )
      `);

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input(
        "content",
        isCarvenOperation
          ? `Ticket creado y cerrado automáticamente por Sistema. Motivo: ${data.motivo}`
          : `Ticket creado. Motivo: ${data.motivo}`,
      )
      .input("author", "Sistema").query(`
        INSERT INTO ticket_notes (ticket_id, note_type, content, author, tags, fecha_creacion)
        VALUES (@ticket_id, 'creacion', @content, @author, 'creado,sistema', GETDATE())
      `);

    return NextResponse.json({ success: true, ticketCode: ticketId });
  } catch (error) {
    if (operation && operationOwner) {
      releaseCarvenOperation(operation, operationOwner);
    }
    logError("Error al crear ticket", error);
    return NextResponse.json(
      { success: false, error: "Error al crear ticket" },
      { status: 500 },
    );
  }
}
