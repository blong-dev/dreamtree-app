'use client';

import { useEffect, useRef, useCallback } from 'react';
import { XIcon, CheckIcon, AlertTriangleIcon, InfoIcon } from '../icons';
import type { ToastType, ToastAction } from './types';

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
  onDismiss: () => void;
}

const toastIcons: Record<ToastType, React.ComponentType<{ width?: number; height?: number }>> = {
  info: InfoIcon,
  success: CheckIcon,
  warning: AlertTriangleIcon,
  error: XIcon,
};

export function Toast({
  message,
  type = 'info',
  duration = 4000,
  action,
  onDismiss,
}: ToastProps) { // code_id:122
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingRef = useRef<number>(duration);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, remainingRef.current);
  }, [onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      remainingRef.current -= Date.now() - startTimeRef.current;
    }
  }, []);

  const resumeTimer = useCallback(() => {
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [startTimer]);

  const Icon = toastIcons[type];

  return (
    <div
      className="toast"
      data-type={type}
      role="alert"
      aria-live="polite"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
    >
      <span className="toast-icon" aria-hidden="true">
        <Icon width={16} height={16} />
      </span>
      <span className="toast-message">{message}</span>
      {action && (
        <button className="toast-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
      <button
        className="toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <XIcon width={14} height={14} />
      </button>
    </div>
  );
}
