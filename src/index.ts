// Punto de entrada del módulo cpu-scheduler
export { run, deriveIntervals } from './core/simulate.js';
export { register, get } from './core/registry.js';
export { Player } from './core/player.js';

export type { Process } from './core/types/process.js';
export type { IAlgorithm, PreemptionMode, ReadyProcess } from './core/types/algorithm.js';
export type { HistoryEvent, History, Interval } from './core/types/history.js';
export type { ProcessMetrics, AggregateMetrics, SimulationResult } from './core/types/simulation-result.js';

export { SimulationProvider } from './react/SimulationProvider.js';
export { ProcessTable } from './react/ProcessTable.js';
export { GanttChart } from './react/GanttChart.js';
export { PlaybackControls } from './react/PlaybackControls.js';
export { MetricsTable } from './react/MetricsTable.js';
export { useSimulation } from './react/SimulationContext.js';
