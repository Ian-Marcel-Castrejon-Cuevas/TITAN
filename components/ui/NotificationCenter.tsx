"use client";

import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, MessageSquare } from "lucide-react";
import type { Notification } from "@/hooks/useNotifications";
import { formatDateTime } from "@/lib/date-format";

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onOpen: (notification: Notification) => void;
}

const notificationLabels: Record<Notification["type"], string> = {
  note: "Nueva nota",
  status: "Cambio de estado",
  assign: "Ticket asignado",
};

const formatNotificationDate = (value: string) => {
  if (!value) return "Ahora";
  return formatDateTime(value);
};

export function NotificationCenter({
  notifications,
  onMarkAllRead,
  onOpen,
}: NotificationCenterProps) {
  if (notifications.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-amber-400/30 bg-slate-900/80 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-amber-400/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-950">
              {notifications.length}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white">Tienes novedades</h3>
            <p className="truncate text-sm text-white/50">
              Revisa la actividad reciente de tus tickets.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-400/15 hover:text-white"
        >
          <CheckCheck className="h-4 w-4" />
          Marcar todo leído
        </button>
      </div>

      <div className="divide-y divide-white/10">
        {notifications.slice(0, 4).map((notification) => (
          <Link
            key={notification.id}
            href={`/tickets/${notification.ticket_id}`}
            onClick={() => onOpen(notification)}
            className="group flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.04]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  {notificationLabels[notification.type] || "Actualización"}
                </span>
                <span className="font-mono text-xs text-white/40">
                  {notification.ticket_id}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-white/80">{notification.message}</p>
              <p className="mt-1 text-xs text-white/35">
                {formatNotificationDate(notification.created_at)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/25 transition group-hover:translate-x-1 group-hover:text-amber-300" />
          </Link>
        ))}
      </div>

      {notifications.length > 4 && (
        <p className="border-t border-white/10 px-5 py-3 text-center text-xs text-white/40">
          Mostrando las 4 notificaciones más recientes
        </p>
      )}
    </section>
  );
}