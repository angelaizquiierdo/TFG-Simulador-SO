// T-05 — Tipos de resultado de simulación y métricas

import type { History, Interval } from './history.js';

/** Métricas individuales por proceso. */
export interface ProcessMetrics {
  readonly id: string;
  readonly completion: number;
  readonly turnaround: number;
  readonly waiting: number;
  readonly response: number;
}

/** Métricas agregadas de toda la simulación. */
export interface AggregateMetrics {
  readonly avgWaiting: number;
  readonly avgTurnaround: number;
  readonly cpuUtilization: number;
  readonly throughput: number;
}

/**
 * Resultado completo de `run()`.
 * `intervals` y `metrics` se derivan del `history` con funciones puras;
 * nunca se acumulan dentro del bucle del motor.
 */
export interface SimulationResult {
  readonly history: History;
  readonly intervals: readonly Interval[];
  readonly metrics: {
    readonly perProcess: readonly ProcessMetrics[];
    readonly aggregate: AggregateMetrics;
  };
}
