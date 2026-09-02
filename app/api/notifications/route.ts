import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";
import { isDemoMode } from "@/lib/demo-store";

/**
 * Obtiene notificaciones filtradas por `user_ch` o `departamento`.
 *
 * Parámetros:
 * - `req` (NextRequest): acepta query params `user_ch`, `departamento`, `only_unread=true`.
 *
 * Retorna:
 * - `NextResponse` con `{ success: true, notifications: [...] }` en caso de éxito.
 * - Si faltan filtros retorna status 400.
 *
 * Excepciones:
 * - Errores de consulta a SQL Server se registran y devuelven como status 500.
 *
 * Ejemplo:
 * await fetch('/api/notifications?user_ch=A123&only_unread=true')
 */
export async function GET(req: NextRequest) {
  try {
    if (isDemoMode()) return NextResponse.json({ success: true, notifications: [] });
    const { searchParams } = new URL(req.url);
    const userCh = searchParams.get("user_ch");
    const departamento = searchParams.get("departamento");
    const onlyUnread = searchParams.get("only_unread") === "true";

    if (!userCh && !departamento) {
      return NextResponse.json(
        { error: "Se requiere user_ch o departamento" },
        { status: 400 },
      );
    }

    const pool = await getDb();

    let query = `
      SELECT n.*, t.motivo as ticket_motivo
      FROM notifications n
      LEFT JOIN tickets t ON n.ticket_id = t.ticket_id
      WHERE (n.user_ch = @userCh OR n.departamento = @departamento)
    `;

    const request = pool.request();
    request.input("userCh", sql.VarChar(50), userCh);
    request.input("departamento", sql.VarChar(100), departamento);

    if (onlyUnread) {
      query += ` AND n.is_read = 0`;
    }

    query += ` ORDER BY n.created_at DESC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`;

    const result = await request.query(query);

    return NextResponse.json({
      success: true,
      notifications: result.recordset,
    });
  } catch (error) {
    console.error("Error GET notifications:", error);
    return NextResponse.json(
      { error: "Error al obtener notificaciones" },
      { status: 500 },
    );
  }
}

/**
 * Crea una nueva notificación en la base de datos.
 *
 * Parámetros:
 * - `req` (NextRequest): body JSON con `ticket_id`, `type`, `message`, y opcionales `user_ch`, `departamento`, `created_by`.
 *
 * Retorna:
 * - `NextResponse` con `{ success: true, message }` cuando se inserta correctamente.
 * - Si faltan campos requeridos retorna status 400.
 *
 * Excepciones:
 * - Errores de inserción en SQL Server.
 *
 * Ejemplo:
 * await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({ ticket_id: 'TKT-...', type: 'info', message: '...' }) })
 */
export async function POST(req: NextRequest) {
  try {
    if (isDemoMode()) return NextResponse.json({ success: true, message: "Notificación creada correctamente" });
    const { user_ch, departamento, ticket_id, type, message, created_by } =
      await req.json();

    if (!ticket_id || !type || !message) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: ticket_id, type, message" },
        { status: 400 },
      );
    }

    const pool = await getDb();

    const request = pool.request();
    request.input("user_ch", sql.VarChar(50), user_ch || null);
    request.input("departamento", sql.VarChar(100), departamento || null);
    request.input("ticket_id", sql.VarChar(50), ticket_id);
    request.input("type", sql.VarChar(20), type);
    request.input("message", sql.Text, message);
    request.input("created_by", sql.VarChar(100), created_by || "system");

    await request.query(
      `INSERT INTO notifications (user_ch, departamento, ticket_id, type, message, created_by, created_at) 
       VALUES (@user_ch, @departamento, @ticket_id, @type, @message, @created_by, GETDATE())`,
    );

    return NextResponse.json({
      success: true,
      message: "Notificación creada correctamente",
    });
  } catch (error) {
    console.error("Error POST notification:", error);
    return NextResponse.json(
      { error: "Error al crear notificación" },
      { status: 500 },
    );
  }
}

/**
 * Marca notificaciones como leídas; puede marcar todas o una lista de IDs.
 *
 * Parámetros:
 * - `req` (NextRequest): body JSON con `mark_all` (boolean) o `notification_ids` (array de números).
 *
 * Retorna:
 * - `NextResponse` con `{ success: true, message }` cuando la operación se completa.
 * - Si no se proveen parámetros válidos retorna status 400.
 *
 * Excepciones:
 * - Errores en las actualizaciones SQL.
 *
 * Ejemplo:
 * await fetch('/api/notifications', { method: 'PUT', body: JSON.stringify({ mark_all: true }) })
 */
export async function PUT(req: NextRequest) {
  try {
    if (isDemoMode()) return NextResponse.json({ success: true, message: "Notificaciones actualizadas correctamente" });
    const { notification_ids, mark_all } = await req.json();

    const pool = await getDb();

    if (mark_all) {
      await pool
        .request()
        .query(`UPDATE notifications SET is_read = 1 WHERE is_read = 0`);
    } else if (notification_ids && notification_ids.length > 0) {
      const request = pool.request();
      notification_ids.forEach((id: number, i: number) => {
        request.input(`id${i}`, sql.Int, id);
      });
      const placeholders = notification_ids
        .map((_: number, i: number) => `@id${i}`)
        .join(",");
      await request.query(
        `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders})`,
      );
    } else {
      return NextResponse.json(
        { error: "Se requiere notification_ids o mark_all=true" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notificaciones actualizadas correctamente",
    });
  } catch (error) {
    console.error("Error PUT notifications:", error);
    return NextResponse.json(
      { error: "Error al marcar notificaciones" },
      { status: 500 },
    );
  }
}

// DELETE: Eliminar notificaciones (opcional)
/**
 * Elimina una notificación por su `id` pasado por query string `?id=...`.
 *
 * Parámetros:
 * - `req` (NextRequest): query param `id` requerido.
 *
 * Retorna:
 * - `NextResponse` con `{ success: true, message }` si la eliminación se realiza.
 *
 * Excepciones:
 * - Errores en la eliminación SQL.
 *
 * Ejemplo:
 * await fetch('/api/notifications?id=123', { method: 'DELETE' })
 */
export async function DELETE(req: NextRequest) {
  try {
    if (isDemoMode()) return NextResponse.json({ success: true, message: "Notificación eliminada correctamente" });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere id de la notificación" },
        { status: 400 },
      );
    }

    const pool = await getDb();
    await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .query("DELETE FROM notifications WHERE id = @id");

    return NextResponse.json({
      success: true,
      message: "Notificación eliminada correctamente",
    });
  } catch (error) {
    console.error("Error DELETE notification:", error);
    return NextResponse.json(
      { error: "Error al eliminar notificación" },
      { status: 500 },
    );
  }
}
