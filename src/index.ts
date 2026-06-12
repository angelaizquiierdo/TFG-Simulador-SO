// Punto de entrada del módulo publicable
// Core
export { run } from './core/simulate.js';
export { register, get } from './core/registry.js';
export { Player } from './core/player.js';

// Tipos
export type { Process } from './core/types/process.js';
export type { IAlgorithm, ReadyProcess, PreemptionMode } from './core/types/algorithm.js';
export type { HistoryEvent, History, Interval } from './core/types/history.js';
export type { SimulationResult, ProcessMetrics, AggregateMetrics } from './core/types/simulation-result.js';

// Componentes React
export { SimulationProvider } from './react/SimulationProvider.js';
export { useSimulation } from './react/SimulationContext.js';
export { GanttChart } from './react/GanttChart.js';
export { ProcessTable } from './react/ProcessTable.js';
export { PlaybackControls } from './react/PlaybackControls.js';
export { MetricsTable } from './react/MetricsTable.js';
