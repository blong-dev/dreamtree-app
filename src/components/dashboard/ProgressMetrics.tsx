'use client';

import { ProgressMetric } from './ProgressMetric';
import type { ProgressMetricData } from './types';

interface ProgressMetricsProps {
  metrics: ProgressMetricData[];
}

export function ProgressMetrics({ metrics }: ProgressMetricsProps) { // code_id:190
  return (
    <div className="progress-metrics">
      {metrics.map((metric, index) => (
        <ProgressMetric key={index} {...metric} />
      ))}
    </div>
  );
}
