// Punto de entrada del módulo publicable.

// Registro de algoritmos
import { register } from './core/registry.js';
import { FCFS } from './core/algorithms/non-preemptive/fcfs.js';
import { SJF } from './core/algorithms/non-preemptive/sjf.js';
import { LJF } from './core/algorithms/non-preemptive/ljf.js';
import { PriorityNP } from './core/algorithms/non-preemptive/priority-np.js';
import { SRTF } from './core/algorithms/preemptive/srtf.js';
import { RoundRobin } from './core/algorithms/preemptive/round-robin.js';
import { PriorityP } from './core/algorithms/preemptive/priority-p.js';
import { VirtualRoundRobin } from './core/algorithms/preemptive/virtual-round-robin.js';
import { MultilevelFeedback } from './core/algorithms/preemptive/multilevel-feedback.js';

register(new FCFS());
register(new SJF());
register(new LJF());
register(new PriorityNP());
register(new SRTF());
register(new RoundRobin());
register(new PriorityP());
register(new VirtualRoundRobin());
register(new MultilevelFeedback());

// Exportaciones del núcleo
export { run, runFrom } from './core/simulate.js';
export { get, register } from './core/registry.js';
export { Player } from './core/player.js';
export type { Process } from './core/types/process.js';
export type { IOOperation, DeviceState } from './core/types/io.js';
export type { IAlgorithm, ReadyProcess, PreemptionMode, SchedulerEvent, AlgorithmParams } from './core/types/algorithm.js';
export type { HistoryEvent, History, Interval } from './core/types/history.js';
export type { SimulationResult, ProcessMetrics, AggregateMetrics } from './core/types/simulation-result.js';

// Exportaciones de los componentes React
export { SimulationProvider } from './react/SimulationProvider.js';
export { useSimulation } from './react/SimulationContext.js';
export { ProcessTable } from './react/ProcessTable.js';
export { GanttChart } from './react/GanttChart.js';
export { PlaybackControls } from './react/PlaybackControls.js';
export { MetricsTable } from './react/MetricsTable.js';
export { ProcessForm } from './react/ProcessForm.js';
export { AlgorithmParamsForm } from './react/AlgorithmParamsForm.js';
