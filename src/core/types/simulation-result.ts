import type { History, Interval } from './history.js';

export interface ProcessMetrics {
  readonly id: string;
  readonly completion: number;
  readonly turnaround: number;
  readonly waiting: number;
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
  readonly intervals: Interval[];
  readonly metrics: {
    readonly perProcess: ProcessMetrics[];
    readonly aggregate: AggregateMetrics;
  };
}
