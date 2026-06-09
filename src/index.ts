// Punto de entrada del módulo publicable cpu-scheduler.
export { run, deriveIntervals, deriveMetrics } from './core/simulate.js';
export type { SimulationConfig } from './core/simulate.js';
export { register, get } from './core/registry.js';
export { Player } from './core/player.js';
export type { Process } from './core/types/process.js';
export type { IAlgorithm, ReadyProcess, PreemptionMode } from './core/types/algorithm.js';
export type { History, HistoryEvent, Interval } from './core/types/history.js';
export type { SimulationResult, ProcessMetrics, AggregateMetrics } from './core/types/simulation-result.js';
export { Simulator } from './react/Simulator.js';
export type { SimulatorProps } from './react/Simulator.js';
export { GanttChart } from './react/GanttChart.js';
export { PlaybackControls } from './react/PlaybackControls.js';
export { MetricsTable } from './react/MetricsTable.js';
