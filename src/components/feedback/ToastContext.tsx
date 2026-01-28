'use client';

import {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { ToastContainer } from './ToastContainer';
import type { Toast, ToastType, ToastAction, ToastPosition } from './types';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
}

export function ToastProvider({
  children,
  position = 'bottom-right',
}: ToastProviderProps) { // code_id:201
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: Toast = {
        id,
        message,
        type: options.type || 'info',
        duration: options.duration || 4000,
        action: options.action,
      };

      setToasts((prev) => [...prev, toast]);
      return id;
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, clearAllToasts }}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        position={position}
      />
    </ToastContext.Provider>
  );
}

export function useToast() { // code_id:202
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
