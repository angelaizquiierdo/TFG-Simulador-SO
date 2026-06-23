import type { History, Interval } from './history.js';

interface ProcessMetrics {
  readonly id: string;
  readonly completion: number;
  readonly turnaround: number;
  readonly waiting: number;
  readonly response: number;
}

interface AggregateMetrics {
  readonly avgWaiting: number;
  readonly avgTurnaround: number;
  readonly cpuUtilization: number;
  readonly throughput: number;
}

interface SimulationResult {
  readonly history: History;
  readonly intervals: readonly Interval[];
  readonly metrics: {
    readonly perProcess: readonly ProcessMetrics[];
    readonly aggregate: AggregateMetrics;
  };
}

export type { ProcessMetrics, AggregateMetrics, SimulationResult };
