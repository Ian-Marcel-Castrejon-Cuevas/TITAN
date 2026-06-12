"use client";

import { createContext, useContext, ReactNode } from "react";
import { useNotification } from "@/hooks/useNotification";
import { Notification } from "@/components/ui/Notification";

interface NotificationContextType {
  success: (
    title: string,
    message: string,
    options?: { duration?: number; playSound?: boolean },
  ) => string;
  error: (
    title: string,
    message: string,
    options?: { duration?: number; playSound?: boolean },
  ) => string;
  info: (
    title: string,
    message: string,
    options?: { duration?: number; playSound?: boolean },
  ) => string;
  warning: (
    title: string,
    message: string,
    options?: { duration?: number; playSound?: boolean },
  ) => string;
  playSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const {
    notifications,
    removeNotification,
    success,
    error,
    info,
    warning,
    playSound,
  } = useNotification();

  return (
    <NotificationContext.Provider
      value={{ success, error, info, warning, playSound }}
    >
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notif) => (
          <Notification
            key={notif.id}
            type={notif.type}
            title={notif.title}
            message={notif.message}
            duration={notif.duration}
            onClose={() => removeNotification(notif.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider",
    );
  }
  return context;
}
