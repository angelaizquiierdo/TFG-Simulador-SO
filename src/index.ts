// Punto de entrada del módulo cpu-scheduler
export { register, get } from './core/registry.js';
export { run, deriveIntervals, deriveMetrics } from './core/simulate.js';
export { Player } from './core/player.js';

// Algoritmos registrados por defecto
import { FCFS } from './core/algorithms/non-preemptive/fcfs.js';
import { SJF } from './core/algorithms/non-preemptive/sjf.js';
import { LJF } from './core/algorithms/non-preemptive/ljf.js';
import { PriorityNP } from './core/algorithms/non-preemptive/priority-np.js';
import { SRTF } from './core/algorithms/preemptive/srtf.js';
import { PriorityP } from './core/algorithms/preemptive/priority-p.js';
import { RoundRobin } from './core/algorithms/preemptive/round-robin.js';
import { register } from './core/registry.js';

register(new FCFS());
register(new SJF());
register(new LJF());
register(new PriorityNP());
register(new SRTF());
register(new PriorityP());
register(new RoundRobin());

// Componentes React
export { SimulationProvider } from './react/SimulationProvider.js';
export { ProcessTable } from './react/ProcessTable.js';
export { GanttChart } from './react/GanttChart.js';
export { PlaybackControls } from './react/PlaybackControls.js';
export { MetricsTable } from './react/MetricsTable.js';
export { useSimulation } from './react/SimulationContext.js';

// Tipos públicos
export type { Process } from './core/types/process.js';
export type { IAlgorithm, ReadyProcess, PreemptionMode } from './core/types/algorithm.js';
export type { HistoryEvent, History, Interval } from './core/types/history.js';
export type { SimulationResult, ProcessMetrics, AggregateMetrics } from './core/types/simulation-result.js';
