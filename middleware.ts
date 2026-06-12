import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que NO requieren autenticación (públicas)
const publicRoutes = ["/login", "/api/auth/login", "/api/auth/verify"];

// Rutas que solo pueden ver administradores
const adminRoutes = ["/soporte", "/reportes"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar si es una ruta pública
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route),
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Verificar si es una ruta que requiere autenticación
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tickets") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/soporte") ||
    pathname.startsWith("/reportes");

  if (isProtectedRoute) {
    // Obtener token de las cookies
    const token = request.cookies.get("cadnux_token")?.value;

    // Si no hay token, redirigir al login (solo para accesos directos por URL)
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar si es ruta de administrador
    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route),
    );

    if (isAdminRoute) {
      // Para rutas de admin, verificamos el rol desde la cookie
      const userRole = request.cookies.get("cadnux_es_admin")?.value;

      if (userRole !== "true") {
        // Si no es admin, redirigir al dashboard
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tickets/:path*",
    "/registro/:path*",
    "/soporte/:path*",
    "/reportes/:path*",
    "/login",
  ],
};
