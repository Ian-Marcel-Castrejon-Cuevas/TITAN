'use client';

import { useEffect, useState } from 'react';
import { X, Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Bell,
  warning: AlertCircle,
};

const colors = {
  success: 'from-green-500 to-emerald-600 border-green-400',
  error: 'from-red-500 to-rose-600 border-red-400',
  info: 'from-blue-500 to-cyan-600 border-blue-400',
  warning: 'from-yellow-500 to-orange-600 border-yellow-400',
};

export function Notification({ type, title, message, duration = 5000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`
        relative overflow-hidden rounded-xl shadow-2xl
        bg-gradient-to-r ${colors[type]}
        border-l-4 ${colors[type]}
      `}>
        <div className="p-4 flex items-start gap-3">
          <div className="flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{title}</p>
            <p className="text-white/80 text-sm mt-0.5">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Barra de progreso */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-white/30"
          style={{
            width: '100%',
            animation: `shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}