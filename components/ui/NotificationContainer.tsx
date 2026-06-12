'use client';

import { Notification } from './Notification';
import { useNotification } from '@/hooks/useNotification';

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
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
  );
}