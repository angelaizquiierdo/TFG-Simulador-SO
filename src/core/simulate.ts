import type { Process } from './types/process.js';
import type { SimulationResult } from './types/simulation-result.js';
import type { History } from './types/history.js';
import type { SchedulerState } from './types/scheduler-state.js';
import { get } from './registry.js';
import { executeSimulationLoop } from './engine/loop.js';
import type { LoopState } from './engine/loop.js';
import { validateProcesses } from './engine/validate.js';
import { deriveIntervals } from './derive/intervals.js';
import { deriveMetrics } from './derive/metrics.js';

// Configuración de la ejecución del motor
interface RunConfig {
  readonly algorithm: string;
  readonly quantum?: number;
  readonly boostInterval?: number;
  readonly quanta?: readonly number[];
}

// Punto de entrada público
function run(processes: readonly Process[], config: RunConfig): SimulationResult {
  validateProcesses(processes);
  const algoParams: Record<string, unknown> = {};
  if (config.quantum !== undefined) algoParams.quantum = config.quantum;
  if (config.boostInterval !== undefined) algoParams.boostInterval = config.boostInterval;
  if (config.quanta !== undefined) algoParams.quanta = config.quanta;
  const algo = get(config.algorithm, algoParams);

  const initialState: LoopState = {
    tick: 0,
    onCPU: null,
    ready: [],
    pending: [],
    completed: [],
  };

  const historyEvents = executeSimulationLoop(
    initialState,
    algo,
    processes,
    config.quantum,
    config.boostInterval,
  );

  const history: History = historyEvents;
  const intervals = deriveIntervals(history);
  const metrics = deriveMetrics(history, processes);

  return { history, intervals, metrics };
}

// Rederivación what-if: continúa la simulación desde un SchedulerState dado (T-21)
function runFrom(
  state: SchedulerState,
  config: RunConfig,
  allProcesses: readonly Process[],
): SimulationResult {
  validateProcesses(allProcesses);

  // T-22: rechazar procesos nuevos (no rastreados en el estado) con arrival_time < tick
  const knownPids = new Set([
    ...state.completed,
    ...state.ready,
    ...(state.onCPU !== null ? [state.onCPU] : []),
  ]);
  for (const p of allProcesses) {
    if (!knownPids.has(p.id) && p.arrival_time < state.tick) {
      throw new Error(
        `Inyección inválida: el proceso "${p.id}" tiene arrival_time=${String(p.arrival_time)} < tick=${String(state.tick)}`,
      );
    }
  }

  const algoParams: Record<string, unknown> = {};
  if (config.quantum !== undefined) algoParams.quantum = config.quantum;
  if (config.boostInterval !== undefined) algoParams.boostInterval = config.boostInterval;
  if (config.quanta !== undefined) algoParams.quanta = config.quanta;
  const algo = get(config.algorithm, algoParams);

  const initialRemaining = new Map<string, number>(
    state.remaining.map((r) => [r.id, r.remaining]),
  );

  const initialLoopState: LoopState = {
    tick: state.tick,
    onCPU: state.onCPU,
    ready: [...state.ready],
    pending: [...state.pending],
    completed: [...state.completed],
  };

  const historyEvents = executeSimulationLoop(
    initialLoopState,
    algo,
    allProcesses,
    config.quantum,
    config.boostInterval,
    initialRemaining,
  );

  const history: History = historyEvents;
  const intervals = deriveIntervals(history);
  const metrics = deriveMetrics(history, allProcesses);

  return { history, intervals, metrics };
}

// Reexport de las funciones de derivación: simulate.ts es la fachada pública del motor
// (src/index.ts y los tests siguen importando deriveIntervals/deriveMetrics desde aquí).
export { run, runFrom, deriveIntervals, deriveMetrics };
export type { RunConfig };
