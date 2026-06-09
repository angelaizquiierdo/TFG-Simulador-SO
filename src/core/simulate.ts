import type { Process } from './types/process.js';
import type { IAlgorithm, ReadyProcess } from './types/algorithm.js';
import type { History, HistoryEvent, Interval } from './types/history.js';
import type {
  SimulationResult,
  ProcessMetrics,
  AggregateMetrics,
} from './types/simulation-result.js';

export interface SimulationConfig {
  quantum?: number;
}

// Convierte datos de proceso a ReadyProcess para el algoritmo
function toReady(
  id: string,
  arrival_time: number,
  burst_time: number,
  remaining: number,
  priority: number | undefined,
): ReadyProcess {
  if (priority !== undefined) {
    return { id, arrival_time, burst_time, remaining, priority };
  }
  return { id, arrival_time, burst_time, remaining };
}

// Extrae el número de un id como "P1", "P10" para desempate numérico
function idNumber(id: string): number {
  const n = parseInt(id.replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// Desempate global: ordena por arrival_time, luego por id numérico
function tieBreakSort(processes: ReadyProcess[]): ReadyProcess[] {
  return [...processes].sort((a, b) => {
    if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
    return idNumber(a.id) - idNumber(b.id);
  });
}

export function deriveIntervals(history: History): Interval[] {
  interface MutableInterval { pid: string | null; start: number; end: number }
  const intervals: MutableInterval[] = [];
  for (const event of history) {
    const last = intervals[intervals.length - 1];
    if (last?.pid === event.onCPU) {
      last.end = event.tick + 1;
    } else {
      intervals.push({ pid: event.onCPU, start: event.tick, end: event.tick + 1 });
    }
  }
  return intervals;
}

export function deriveMetrics(
  history: History,
  processes: readonly Process[],
): { perProcess: ProcessMetrics[]; aggregate: AggregateMetrics } {
  if (history.length === 0 || processes.length === 0) {
    return {
      perProcess: [],
      aggregate: { avgWaiting: 0, avgTurnaround: 0, cpuUtilization: 0, throughput: 0 },
    };
  }

  const lastEvent = history[history.length - 1];
  const totalTicks = lastEvent !== undefined ? lastEvent.tick + 1 : 0;

  const perProcess: ProcessMetrics[] = [];
  let totalWaiting = 0;
  let totalTurnaround = 0;
  let cpuBusyTicks = 0;

  const firstOnCpu = new Map<string, number>();
  const completionTick = new Map<string, number>();

  for (const event of history) {
    if (event.onCPU !== null) {
      cpuBusyTicks++;
      if (!firstOnCpu.has(event.onCPU)) {
        firstOnCpu.set(event.onCPU, event.tick);
      }
    }
    const prevEvent = history[event.tick - 1];
    const prevCompleted = prevEvent !== undefined ? prevEvent.completed : [];
    for (const pid of event.completed) {
      if (!prevCompleted.includes(pid) && !completionTick.has(pid)) {
        // El proceso aparece en completed por primera vez en este tick,
        // lo que significa que finalizó al final del tick anterior (tiempo = event.tick)
        completionTick.set(pid, event.tick);
      }
    }
  }

  for (const proc of processes) {
    const completion = completionTick.get(proc.id) ?? totalTicks;
    const turnaround = completion - proc.arrival_time;
    const waiting = turnaround - proc.burst_time;
    const firstCpu = firstOnCpu.get(proc.id) ?? completion;
    const response = firstCpu - proc.arrival_time;
    perProcess.push({ id: proc.id, completion, turnaround, waiting, response });
    totalWaiting += waiting;
    totalTurnaround += turnaround;
  }

  const n = processes.length;
  return {
    perProcess,
    aggregate: {
      avgWaiting: totalWaiting / n,
      avgTurnaround: totalTurnaround / n,
      cpuUtilization: totalTicks > 0 ? cpuBusyTicks / totalTicks : 0,
      throughput: totalTicks > 0 ? n / totalTicks : 0,
    },
  };
}

// Construye un ReadyProcess desde el mapa de procesos
function buildReady(
  id: string,
  processMap: Map<string, Process>,
  remaining: Map<string, number>,
): ReadyProcess {
  const proc = processMap.get(id);
  const rem = remaining.get(id) ?? 0;
  if (proc === undefined) {
    throw new Error(`Proceso no encontrado: ${id}`);
  }
  return toReady(id, proc.arrival_time, proc.burst_time, rem, proc.priority);
}

export function run(
  processes: readonly Process[],
  algorithm: IAlgorithm,
  config: SimulationConfig = {},
): SimulationResult {
  // Validar burst_time
  for (const p of processes) {
    if (p.burst_time <= 0) {
      throw new Error('La ráfaga debe ser mayor que 0');
    }
  }

  if (processes.length === 0) {
    return {
      history: [],
      intervals: [],
      metrics: {
        perProcess: [],
        aggregate: { avgWaiting: 0, avgTurnaround: 0, cpuUtilization: 0, throughput: 0 },
      },
    };
  }

  const quantum = config.quantum ?? 1;

  const processMap = new Map<string, Process>(processes.map(p => [p.id, p]));
  const remaining = new Map<string, number>(processes.map(p => [p.id, p.burst_time]));

  let onCPU: string | null = null;
  let quantumLeft = 0;
  let requeueAfterArrivals: string | null = null; // proceso a reencolar tras llegadas
  const readyQueue: string[] = [];
  const pendingSet = new Set<string>(processes.map(p => p.id));
  const completedSet = new Set<string>();
  const history: HistoryEvent[] = [];

  const totalWork = processes.reduce((s, p) => s + p.burst_time, 0);
  let tick = 0;
  let workDone = 0;

  while (workDone < totalWork) {
    // 1. Llegan procesos en este tick (ANTES de reencolados del quantum)
    for (const p of processes) {
      if (p.arrival_time === tick && pendingSet.has(p.id)) {
        pendingSet.delete(p.id);
        readyQueue.push(p.id);
      }
    }

    // 1b. Reencolado diferido del quantum agotado (va después de los que llegaron)
    if (requeueAfterArrivals !== null) {
      readyQueue.push(requeueAfterArrivals);
      requeueAfterArrivals = null;
    }

    // 2. Seleccionar proceso según preemptionMode
    if (algorithm.preemptionMode === 'none') {
      if (onCPU === null && readyQueue.length > 0) {
        const readyProcesses = readyQueue.map(id => buildReady(id, processMap, remaining));
        const sorted = tieBreakSort(readyProcesses);
        const selected = algorithm.select(sorted);
        onCPU = selected.id;
        readyQueue.splice(readyQueue.indexOf(onCPU), 1);
      }
    } else if (algorithm.preemptionMode === 'on-better') {
      if (readyQueue.length > 0 || onCPU !== null) {
        const candidates: ReadyProcess[] = [];
        if (onCPU !== null) {
          candidates.push(buildReady(onCPU, processMap, remaining));
        }
        for (const id of readyQueue) {
          candidates.push(buildReady(id, processMap, remaining));
        }
        const sorted = tieBreakSort(candidates);
        const selected = algorithm.select(sorted);
        if (selected.id !== onCPU) {
          if (onCPU !== null) {
            readyQueue.unshift(onCPU);
          }
          readyQueue.splice(readyQueue.indexOf(selected.id), 1);
          onCPU = selected.id;
          quantumLeft = quantum;
        }
      }
    } else {
      // 'on-quantum' — Round Robin: el orden FIFO de la cola no se reordena
      if (onCPU === null && readyQueue.length > 0) {
        const readyProcesses = readyQueue.map(id => buildReady(id, processMap, remaining));
        const selected = algorithm.select(readyProcesses);
        onCPU = selected.id;
        readyQueue.splice(readyQueue.indexOf(onCPU), 1);
        quantumLeft = quantum;
      }
    }

    // 3. Registrar el evento de este tick
    const message = buildMessage(onCPU, tick);
    history.push({
      tick,
      onCPU,
      ready: [...readyQueue],
      pending: [...pendingSet],
      completed: [...completedSet],
      message,
    });

    // 4. Ejecutar un tick de CPU
    if (onCPU !== null) {
      const rem = (remaining.get(onCPU) ?? 0) - 1;
      remaining.set(onCPU, rem);
      workDone++;
      quantumLeft--;

      if (rem === 0) {
        completedSet.add(onCPU);
        onCPU = null;
        quantumLeft = 0;
      } else if (algorithm.preemptionMode === 'on-quantum' && quantumLeft === 0) {
        // Diferir el reencolo al inicio del siguiente tick (después de llegadas)
        requeueAfterArrivals = onCPU;
        onCPU = null;
      }
    }

    tick++;
  }

  const history_: History = history;
  const intervals = deriveIntervals(history_);
  const metrics = deriveMetrics(history_, processes);

  return { history: history_, intervals, metrics };
}

function buildMessage(onCPU: string | null, tick: number): string {
  if (onCPU === null) return `Tick ${tick.toString()}: CPU inactiva`;
  return `Tick ${tick.toString()}: ${onCPU} en CPU`;
}
