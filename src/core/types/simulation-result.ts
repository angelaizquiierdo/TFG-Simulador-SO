import type { History, Interval } from './history.js';

// Métricas por proceso (derivadas del history)
export interface ProcessMetrics {
  readonly id: string;
  readonly completion: number;
  readonly turnaround: number;
  readonly waiting: number;
  readonly response: number;
}

// Métricas agregadas (derivadas del history)
export interface AggregateMetrics {
  readonly avgWaiting: number;
  readonly avgTurnaround: number;
  readonly cpuUtilization: number;
  readonly throughput: number;
}

// Resultado completo de una simulación
export interface SimulationResult {
  readonly history: History;
  readonly intervals: Interval[];
  readonly metrics: {
    readonly perProcess: ProcessMetrics[];
    readonly aggregate: AggregateMetrics;
  };
}
