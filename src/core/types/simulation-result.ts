import type { History, Interval } from './history.js';

// Métricas individuales por proceso
export interface ProcessMetrics {
  readonly id: string;
  readonly completion: number;
  readonly turnaround: number;
  readonly waiting: number;
  readonly response: number;
}

// Métricas agregadas de la simulación
export interface AggregateMetrics {
  readonly avgWaiting: number;
  readonly avgTurnaround: number;
  readonly cpuUtilization: number;
  readonly throughput: number;
}

// Resultado completo devuelto por run() — intervals y metrics se derivan del history
export interface SimulationResult {
  readonly history: History;
  readonly intervals: Interval[];
  readonly metrics: {
    readonly processes: ProcessMetrics[];
    readonly aggregate: AggregateMetrics;
  };
}
