'use client';

interface ProgressMetricProps {
  value: string | number;
  label: string;
}

export function ProgressMetric({ value, label }: ProgressMetricProps) { // code_id:189
  return (
    <div className="progress-metric">
      <span className="progress-metric-value">{value}</span>
      <span className="progress-metric-label">{label}</span>
    </div>
  );
}
