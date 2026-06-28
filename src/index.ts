// Punto de entrada del módulo cpu-scheduler

// Componentes React
export { SimulationProvider } from './react/SimulationProvider.js';
export { SimulationApp } from './react/SimulationApp.js';
export { ProcessTable } from './react/ProcessTable.js';
export { GanttChart } from './react/GanttChart.js';
export { PlaybackControls } from './react/PlaybackControls.js';
export { MetricsTable } from './react/MetricsTable.js';
export { ProcessForm } from './react/ProcessForm.js';
export { WhatIfControls } from './react/WhatIfControls.js';
export { AlgorithmParamsForm } from './react/AlgorithmParamsForm.js';
export { useSimulation } from './react/SimulationContext.js';
export type {
  SimulationContextValue,
  WhatIfBranch,
  WhatIfOverrides,
  AlgorithmRequires,
} from './react/SimulationContext.js';

// Core
export { register, get } from './core/registry.js';
export { run, runFrom, deriveIntervals, deriveMetrics } from './core/simulate.js';
export { Player } from './core/player.js';
export { FifoQueue } from './core/algorithms/shared/fifo-queue.js';
export { FCFS } from './core/algorithms/non-preemptive/fcfs.js';
export { SJF } from './core/algorithms/non-preemptive/sjf.js';
export { LJF } from './core/algorithms/non-preemptive/ljf.js';
export { PriorityNP } from './core/algorithms/non-preemptive/priority-np.js';
export { SRTF } from './core/algorithms/preemptive/srtf.js';
export { PriorityP } from './core/algorithms/preemptive/priority-p.js';
export { RoundRobin } from './core/algorithms/preemptive/round-robin.js';
export { VirtualRoundRobin } from './core/algorithms/preemptive/virtual-round-robin.js';
export { MLFQ } from './core/algorithms/preemptive/multilevel-feedback.js';

import { register } from './core/registry.js';
import { FCFS } from './core/algorithms/non-preemptive/fcfs.js';
import { SJF } from './core/algorithms/non-preemptive/sjf.js';
import { LJF } from './core/algorithms/non-preemptive/ljf.js';
import { PriorityNP } from './core/algorithms/non-preemptive/priority-np.js';
import { SRTF } from './core/algorithms/preemptive/srtf.js';
import { PriorityP } from './core/algorithms/preemptive/priority-p.js';
import { RoundRobin } from './core/algorithms/preemptive/round-robin.js';
import { VirtualRoundRobin } from './core/algorithms/preemptive/virtual-round-robin.js';
import { MLFQ } from './core/algorithms/preemptive/multilevel-feedback.js';

register(new FCFS());
register(new SJF());
register(new LJF());
register(new PriorityNP());
register(new SRTF());
register(new PriorityP());
register(new RoundRobin());
register(new VirtualRoundRobin());
register(new MLFQ());
