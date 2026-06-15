import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/api/auth/login", "/api/auth/verify"];

const adminRoutes = ["/soporte", "/reportes"];

export function middleware(request: NextRequest) {
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
    pathname.startsWith("/reportes");

  if (isProtectedRoute) {
    const token = request.cookies.get("cadnux_token")?.value;

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
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
  ],
};
