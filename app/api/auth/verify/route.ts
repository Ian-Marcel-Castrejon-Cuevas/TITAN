import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  /**
   * Verifica la validez de un token JWT enviado en `Authorization: Bearer <token>`.
   *
   * Parámetros:
   * - `request` (NextRequest): cabecera `authorization` requerida.
   *
   * Retorna:
   * - `NextResponse` con `{ valid: true, user }` si el token es válido.
   * - Si no se proporciona o es inválido, retorna `{ valid: false, error }` con status 401.
   *
   * Excepciones:
   * - Errores inesperados de verificación devuelven status 500.
   *
   * Ejemplo:
   * await fetch('/api/auth/verify', { headers: { Authorization: 'Bearer <token>' } })
   */
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, error: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'CADNUX_JWT_SECRET_KEY_2024');
      return NextResponse.json({ valid: true, user: decoded });
    } catch {
      return NextResponse.json(
        { valid: false, error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Error al verificar token' },
      { status: 500 }
    );
  }
}