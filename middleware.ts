import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/login",
  "/api/auth/login",
  "/api/auth/verify",
  "/api/auth/session",
];

const adminRoutes = ["/soporte", "/reportes"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route),
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tickets") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/soporte") ||
    pathname.startsWith("/reportes") ||
    pathname.startsWith("/api/");

  if (isProtectedRoute) {
    const token = request.cookies.get("cadnux_token")?.value;
    const session = request.cookies.get("titan_session")?.value;
    const isApiRoute = pathname.startsWith("/api/");

    if (!token || !session) {
      if (isApiRoute) {
        return NextResponse.json(
          { success: false, error: "Sesión requerida" },
          { status: 401 },
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    let sessionResponse: Response;
    try {
      sessionResponse = await fetch(
        new URL("/api/auth/session", request.url),
        {
          headers: { cookie: request.headers.get("cookie") || "" },
          cache: "no-store",
        },
      );
    } catch {
      if (isApiRoute) {
        return NextResponse.json(
          { success: false, error: "Servicio de sesión no disponible" },
          { status: 503 },
        );
      }
      return NextResponse.next();
    }

    if (!sessionResponse.ok) {
      if (sessionResponse.status === 401 && isApiRoute) {
        return NextResponse.json(
          { success: false, error: "Sesión inválida o expirada" },
          { status: 401 },
        );
      }
      if (sessionResponse.status === 401) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      if (isApiRoute) {
        return NextResponse.json(
          { success: false, error: "Servicio de sesión no disponible" },
          { status: 503 },
        );
      }
      return NextResponse.next();
    }

    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route),
    );

    if (isAdminRoute) {
      const userRole = request.cookies.get("cadnux_es_admin")?.value;

      if (userRole !== "true") {
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
    "/api/tickets/:path*",
    "/api/notifications/:path*",
    "/api/buscar-usuario/:path*",
    "/api/empleados/:path*",
    "/api/delete-carven/:path*",
    "/api/restart-carven1/:path*",
    "/api/restart-carven2/:path*",
    "/api/restart-carven3/:path*",
  ],
};
