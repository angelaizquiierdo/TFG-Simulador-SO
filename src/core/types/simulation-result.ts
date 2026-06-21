import type { History } from './history.js';
import type { Interval } from './history.js';

export interface ProcessMetrics {
  readonly id: string;
  readonly completion: number;
  readonly turnaround: number;
  readonly waiting: number;     // turnaround - CPU_total - bloqueado_total
  readonly response: number;
}

export interface AggregateMetrics {
  readonly avgWaiting: number;
  readonly avgTurnaround: number;
  readonly cpuUtilization: number;
  readonly throughput: number;
}

export interface SimulationResult {
  readonly history: History;
  readonly intervals: readonly Interval[];
  readonly metrics: readonly ProcessMetrics[];
  readonly aggregateMetrics: AggregateMetrics;
}
