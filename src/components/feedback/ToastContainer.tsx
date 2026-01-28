'use client';

import { Toast } from './Toast';
import type { Toast as ToastType, ToastPosition } from './types';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
  position?: ToastPosition;
}

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'bottom-right',
}: ToastContainerProps) { // code_id:200
  // Only show max 3 toasts
  const visibleToasts = toasts.slice(0, 3);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="toast-container" data-position={position}>
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
