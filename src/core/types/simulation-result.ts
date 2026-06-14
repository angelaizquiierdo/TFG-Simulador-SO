import type { History, Interval } from './history.js';

// Métricas individuales por proceso
export interface ProcessMetrics {
  readonly id:          string;
  readonly completion:  number;
  readonly turnaround:  number;
  readonly waiting:     number;
  readonly response:    number;
}

// Métricas agregadas de la simulación completa
export interface AggregateMetrics {
  readonly avgWaiting:      number;
  readonly avgTurnaround:   number;
  readonly cpuUtilization:  number;
  readonly throughput:      number;
}

// Resultado completo devuelto por run()
export interface SimulationResult {
  readonly history:   History;
  readonly intervals: Interval[];
  readonly metrics:   {
    readonly perProcess: ProcessMetrics[];
    readonly aggregate:  AggregateMetrics;
  };
}
