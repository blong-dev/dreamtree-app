'use client';

interface DividerProps {
  type?: 'section' | 'module';
  label?: string;
}

export function Divider({ type = 'section', label }: DividerProps) { // code_id:168
  return (
    <div className="divider" data-type={type} role="separator">
      {label && <span className="divider-label">{label}</span>}
    </div>
  );
}
