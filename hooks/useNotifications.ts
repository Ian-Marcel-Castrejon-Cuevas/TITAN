import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";

export interface Notification {
  id: number;
  user_ch: string | null;
  departamento: string | null;
  ticket_id: string;
  type: "note" | "status" | "assign";
  message: string;
  is_read: boolean;
  created_by: string;
  created_at: string;
  ticket_motivo?: string;
}

const DEPARTAMENTOS: Record<number, string> = {
  1: "Dirección General",
  2: "Coordinación General",
  3: "Recuperación",
  4: "Administración",
  5: "Contabilidad",
  6: "Jurídico",
  7: "Captura",
  8: "Gestores Externos",
  9: "Sistemas",
  10: "Sucursales",
  11: "ARQUITECTURA",
  12: "AT&T",
  13: "AUDITORIA INTERNA",
  14: "BBVA",
  15: "Capacitación",
  16: "CITIBANAMEX",
  17: "COMPRAS",
  18: "COMUNICACION",
  19: "GM FINANCIAL",
  20: "GM FINANCIAL LEGAL",
  21: "INFONAVIT CAMPECHE",
  22: "INFONAVIT CANCUN",
  23: "INFONAVIT CDMX",
  24: "INFONAVIT CELAYA",
  25: "INFONAVIT CHETUMAL",
  26: "INFONAVIT GARCIA",
  27: "INFONAVIT IRAPUATO",
  28: "INFONAVIT LEON",
  29: "INFONAVIT MONTERREY",
  30: "INFONAVIT NUEVO LAREDO",
  31: "INFONAVIT NUEVO LEON",
  32: "INFONAVIT PLAYA DEL CARMEN",
  33: "INFONAVIT REYNOSA",
  34: "INFONAVIT TAMPICO",
  35: "MONITOREO Y CALIDAD",
  36: "RECURSOS HUMANOS",
  37: "SERVICIOS INTERNOS",
  38: "SUCURSAL CANCUN",
  39: "SUCURSAL CDMX",
  40: "SUCURSAL CHIAPAS",
  41: "SUCURSAL CHIHUAHUA",
  42: "SUCURSAL COLIMA",
  43: "SUCURSAL CULIACAN",
  44: "SUCURSAL GUADALAJARA",
  45: "SUCURSAL HERMOSILLO",
  46: "SUCURSAL LEON",
  47: "SUCURSAL MEXICALI",
  48: "SUCURSAL MONTERREY",
  49: "SUCURSAL MORELIA",
  50: "SUCURSAL OAXACA",
  51: "SUCURSAL PUEBLA",
  52: "SUCURSAL VERACRUZ",
  53: "TOYOTA",
  54: "VOLKSWAGEN (LEGAL)",
  55: "INFONAVIT CHIHUAHUA",
  56: "SCOTIABANK",
  57: "SEGURIDAD DE LA INFORMACIÓN",
  58: "Capacitación",
};

export function useNotifications() {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.ch || !user?.departamento) {
      return;
    }

    try {
      const departamentoNombre = DEPARTAMENTOS[user.departamento] || "Otros";

      const response = await fetch(
        `/api/notifications?user_ch=${encodeURIComponent(user.ch)}&departamento=${encodeURIComponent(departamentoNombre)}&only_unread=true`,
      );
      const data = await response.json();

      if (data.success) {
        const unreadNotifs = data.notifications || [];
        const hasNew = unreadNotifs.length > 0;

        setUnreadCount(unreadNotifs.length);
        setHasUnread(hasNew);
        setNotifications(unreadNotifs);

        if (hasNew) {
          console.log(
            `🔔 ${unreadNotifs.length} notificación(es) nueva(s) para ${departamentoNombre}`,
          );
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user?.ch, user?.departamento]);

  const markAsRead = useCallback(
    async (notificationIds?: number[]) => {
      if (!user?.ch) return;

      try {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            notificationIds
              ? { notification_ids: notificationIds }
              : { mark_all: true },
          ),
        });

        if (notificationIds?.length) {
          const idsToRemove = new Set(notificationIds);
          setNotifications((previous) => {
            const remaining = previous.filter(
              (notification) => !idsToRemove.has(notification.id),
            );
            setUnreadCount(remaining.length);
            setHasUnread(remaining.length > 0);
            return remaining;
          });
        } else {
          setHasUnread(false);
          setUnreadCount(0);
          setNotifications([]);
        }
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    },
    [user?.ch],
  );

  useEffect(() => {
    if (!user?.ch || !user?.departamento) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications, user?.ch, user?.departamento]);

  return {
    hasUnread,
    unreadCount,
    notifications,
    markAsRead,
    fetchNotifications,
  };
}
