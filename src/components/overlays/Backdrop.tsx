'use client';

interface BackdropProps {
  visible: boolean;
  onClick: () => void;
}

export function Backdrop({ visible, onClick }: BackdropProps) { // code_id:258
  if (!visible) return null;

  return (
    <div
      className="backdrop"
      onClick={onClick}
      aria-hidden="true"
    />
  );
}
