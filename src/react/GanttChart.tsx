import React from 'react';
import type { Interval } from '../core/types/history.js';

export interface GanttChartProps {
  intervals: Interval[];
}

export function GanttChart({ intervals }: GanttChartProps): React.JSX.Element {
  return (
    <div data-testid="gantt-chart">
      {intervals.map((interval, i) => (
        <span
          key={i}
          data-testid={`gantt-${interval.pid ?? 'idle'}-${String(interval.start)}-${String(interval.end)}`}
          data-idle={interval.pid === null ? 'true' : undefined}
        >
          {interval.pid ?? 'Inactivo'}[{interval.start}–{interval.end}]
        </span>
      ))}
    </div>
  );
}
