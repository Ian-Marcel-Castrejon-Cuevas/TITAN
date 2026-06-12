import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
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
    } catch (jwtError) {
      return NextResponse.json(
        { valid: false, error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Error al verificar token' },
      { status: 500 }
    );
  }
}