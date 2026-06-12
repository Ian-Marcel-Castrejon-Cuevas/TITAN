import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import sql from 'mssql';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userCh = searchParams.get('user_ch');
    const departamento = searchParams.get('departamento');
    const onlyUnread = searchParams.get('only_unread') === 'true';

    if (!userCh && !departamento) {
      return NextResponse.json({ error: 'Se requiere user_ch o departamento' }, { status: 400 });
    }

    const pool = await getDb();
    
    let query = `
      SELECT n.*, t.motivo as ticket_motivo
      FROM notifications n
      LEFT JOIN tickets t ON n.ticket_id = t.ticket_id
      WHERE (n.user_ch = @userCh OR n.departamento = @departamento)
    `;
    
    const request = pool.request();
    request.input('userCh', sql.VarChar(50), userCh);
    request.input('departamento', sql.VarChar(100), departamento);
    
    if (onlyUnread) {
      query += ` AND n.is_read = 0`;
    }
    
    query += ` ORDER BY n.created_at DESC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`;
    
    const result = await request.query(query);
    
    return NextResponse.json({ success: true, notifications: result.recordset });
    
  } catch (error) {
    console.error('Error GET notifications:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_ch, departamento, ticket_id, type, message, created_by } = await req.json();
    
    if (!ticket_id || !type || !message) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    
    const pool = await getDb();
    
    const request = pool.request();
    request.input('user_ch', sql.VarChar(50), user_ch || null);
    request.input('departamento', sql.VarChar(100), departamento || null);
    request.input('ticket_id', sql.VarChar(50), ticket_id);
    request.input('type', sql.VarChar(20), type);
    request.input('message', sql.Text, message);
    request.input('created_by', sql.VarChar(100), created_by);
    
    await request.query(
      `INSERT INTO notifications (user_ch, departamento, ticket_id, type, message, created_by, created_at) 
       VALUES (@user_ch, @departamento, @ticket_id, @type, @message, @created_by, GETDATE())`
    );
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error POST notification:', error);
    return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { notification_ids, mark_all } = await req.json();
    
    const pool = await getDb();
    
    if (mark_all) {
      await pool.request().query(`UPDATE notifications SET is_read = 1 WHERE is_read = 0`);
    } else if (notification_ids && notification_ids.length > 0) {
      const request = pool.request();
      notification_ids.forEach((id: number, i: number) => {
        request.input(`id${i}`, sql.Int, id);
      });
      const placeholders = notification_ids.map((_: number, i: number) => `@id${i}`).join(',');
      await request.query(`UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders})`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error PUT notifications:', error);
    return NextResponse.json({ error: 'Error al marcar notificaciones' }, { status: 500 });
  }
}