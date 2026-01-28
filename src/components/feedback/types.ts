// Feedback Component Types

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
};

export type ToastPosition = 'bottom-right' | 'bottom-center' | 'top-right' | 'top-center';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
};
