"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useDashboardNotifications } from "@/hooks/useDashboardNotifications";
import { useEmpleadoFoto } from "@/hooks/useEmpleadoFoto";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  LogOut,
  Headset,
  Shield,
} from "lucide-react";
import { useState } from "react";

const commonMenuItems = [
  { href: "/tickets", icon: Ticket, label: "Mis Tickets" },
  { href: "/registro", icon: PlusCircle, label: "Nuevo Ticket" },
];

const adminOnlyItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { hasUnread: hasMisTicketsUnread } = useNotifications();
  const { hasNewTickets: hasDashboardNew, reset: resetDashboard } =
    useDashboardNotifications();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userCh =
    user?.ch && user.ch !== "undefined" && user.ch !== "null" ? user.ch : null;

  const { fotoBase64, cargando } = useEmpleadoFoto(userCh || undefined);

  const getNombreCorto = (nombre: string, maxLength: number = 20) => {
    if (
      !nombre ||
      nombre === "undefined" ||
      nombre === "null" ||
      nombre.trim() === ""
    ) {
      return "Usuario";
    }
    if (nombre.length <= maxLength) return nombre;
    return nombre.substring(0, maxLength) + "...";
  };

  const menuItems = isAdmin
    ? [...adminOnlyItems, ...commonMenuItems]
    : commonMenuItems;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
  };

  const handleNavClick = (href: string) => {
    if (href === "/dashboard" && hasDashboardNew) {
      resetDashboard();
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900/95 to-slate-900/98 backdrop-blur-xl border-r border-white/10 z-50 transition-all duration-300
        ${isCollapsed ? "w-20" : "w-72"}`}
    >
      <div className="flex flex-col h-full">
        <div
          className={`p-6 border-b border-white/10 ${isCollapsed ? "px-4" : ""}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl blur-lg opacity-50 animate-pulse-glow" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                <Headset className="w-6 h-6 text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  TITAN
                </h1>
                <p className="text-xs text-white/40 truncate">
                  TICKETING AND INCIDENT TRACKING ADMINISTRATION NETWORK
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          className={`mx-4 mt-6 p-4 rounded-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-white/10 ${isCollapsed ? "flex justify-center" : ""}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {!cargando ? (
                <ProfilePhoto
                  nombre={user?.nombre}
                  fotoBase64={fotoBase64}
                  size={48}
                />
              ) : (
                <div
                  className="rounded-full bg-slate-700 animate-pulse"
                  style={{ width: 48, height: 48 }}
                />
              )}

              {isAdmin && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}

              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p
                  className="text-white font-semibold text-sm truncate"
                  title={user?.nombre || "Usuario"}
                >
                  {getNombreCorto(user?.nombre || "", 20)}
                </p>
                <p className="text-white/40 text-xs">{userCh || "CH00000"}</p>
                {isAdmin && (
                  <p className="text-primary-400 text-xs mt-1">Administrador</p>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-all duration-300 shadow-lg z-50"
        >
          {isCollapsed ? "→" : "←"}
        </button>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p
            className={`text-xs font-semibold text-white/40 uppercase tracking-wider ${isCollapsed ? "text-center" : "px-3 py-2"}`}
          >
            {isCollapsed ? "≡" : "Menú Principal"}
          </p>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const shouldBlink =
              (item.href === "/dashboard" && hasDashboardNew) ||
              (item.href === "/tickets" && hasMisTicketsUnread);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`
                  relative flex items-center gap-3 rounded-xl transition-all duration-200 group overflow-hidden
                  ${isCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"}
                  ${
                    isActive
                      ? "bg-gradient-to-r from-primary-500/20 to-primary-500/10 border border-primary-500/30"
                      : "hover:bg-white/5"
                  }
                `}
                title={isCollapsed ? item.label : ""}
              >
                {shouldBlink && (
                  <>
                    <div className="absolute inset-0 bg-yellow-500/30 animate-pulse-fast" />
                    <div className="absolute -inset-1 bg-yellow-400/30 blur-xl animate-ping-fast" />
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500" />
                  </>
                )}

                <item.icon
                  className={`w-5 h-5 transition-all duration-200 flex-shrink-0 relative z-10 ${
                    isActive
                      ? "text-primary-400"
                      : shouldBlink
                        ? "text-yellow-400"
                        : "text-white/40 group-hover:text-white/60"
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`text-sm font-medium flex-1 relative z-10 ${
                      isActive
                        ? "text-white"
                        : shouldBlink
                          ? "text-yellow-400"
                          : "text-white/60 group-hover:text-white/80"
                    }`}
                  >
                    {item.label}
                    {shouldBlink && (
                      <span className="ml-2 text-yellow-400 text-xs animate-bounce inline-block">
                        ● Nuevo
                      </span>
                    )}
                  </span>
                )}
                {!isCollapsed && isActive && (
                  <div className="w-1 h-8 bg-primary-500 rounded-full relative z-10" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center gap-3 rounded-xl hover:bg-red-500/10 transition-all duration-200 group
              ${isCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"}
              disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isCollapsed ? "Cerrar Sesión" : ""}
          >
            <LogOut className="w-5 h-5 text-red-400/60 group-hover:text-red-400 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm text-red-400/60 group-hover:text-red-400 flex-1 text-left">
                {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
              </span>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-fast {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.7;
          }
        }
        @keyframes ping-fast {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          75%,
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
        :global(.animate-pulse-fast) {
          animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }
        :global(.animate-ping-fast) {
          animation: ping-fast 1.5s cubic-bezier(0, 0, 0.2, 1) infinite !important;
        }
      `}</style>
    </aside>
  );
}
