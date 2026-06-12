import type { IAlgorithm, ReadyProcess } from './types/algorithm.js';
import type { History, HistoryEvent, Interval } from './types/history.js';
import type { Process } from './types/process.js';
import type {
  AggregateMetrics,
  ProcessMetrics,
  SimulationResult,
} from './types/simulation-result.js';

// Configuración de ejecución de la simulación
export interface SimulationConfig {
  quantum?: number;
}

// Extrae el número al final de un id (p.ej. "P10" → 10) para desempate numérico
function idToNumber(id: string): number {
  const match = /\d+$/.exec(id);
  return match?.[0] !== undefined ? parseInt(match[0], 10) : 0;
}

// Ordena un conjunto de procesos para desempate: menor arrival_time → menor id numérico
function sortByTiebreak(queue: ReadyProcess[]): ReadyProcess[] {
  return [...queue].sort((a, b) => {
    if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
    return idToNumber(a.id) - idToNumber(b.id);
  });
}

// Construye un ReadyProcess desde Process + remaining actual
function toReady(proc: Process, remaining: number): ReadyProcess {
  const base = {
    id: proc.id,
    arrival_time: proc.arrival_time,
    burst_time: proc.burst_time,
    remaining,
  };
  return proc.priority !== undefined ? { ...base, priority: proc.priority } : base;
}

// Prefijo de mensaje para el primer tick de cada nuevo turno en CPU (incluso re-selección RR)
const MSG_SELECCIONADO = 'Seleccionado:';

// Colapsa ticks consecutivos del mismo onCPU en intervalos.
// Rompe el intervalo cuando el mensaje indica "Seleccionado:" (nueva selección, p.ej. RR
// que reencola y vuelve a seleccionar el mismo proceso al agotar el quantum).
export function deriveIntervals(history: History): Interval[] {
  const intervals: Interval[] = [];
  let i = 0;
  while (i < history.length) {
    const event = history[i];
    if (event === undefined) break;
    const pid = event.onCPU;
    const start = event.tick;
    let end = start + 1;
    let j = i + 1;
    while (j < history.length) {
      const next = history[j];
      if (next === undefined) break;
      // Romper si cambia el pid O si el siguiente es una nueva selección del mismo pid
      if (next.onCPU !== pid) break;
      if (next.message.startsWith(MSG_SELECCIONADO)) break;
      end = next.tick + 1;
      j++;
    }
    intervals.push({ pid, start, end });
    i = j;
  }
  return intervals;
}

// Calcula métricas por proceso y agregadas a partir del historial
export function deriveMetrics(
  history: History,
  processes: Process[],
): SimulationResult['metrics'] {
  const totalTicks = history.length;

  // Primer tick en CPU (para response time) y tick de finalización
  const firstOnCPU = new Map<string, number>();
  const completionTick = new Map<string, number>();

  for (const event of history) {
    if (event.onCPU !== null && !firstOnCPU.has(event.onCPU)) {
      firstOnCPU.set(event.onCPU, event.tick);
    }
    for (const id of event.completed) {
      if (!completionTick.has(id)) {
        completionTick.set(id, event.tick);
      }
    }
  }

  const activeTicks = history.filter((e) => e.onCPU !== null).length;

  const processMetrics: ProcessMetrics[] = processes.map((p) => {
    const completion = (completionTick.get(p.id) ?? 0) + 1;
    const turnaround = completion - p.arrival_time;
    const waiting = turnaround - p.burst_time;
    const response = (firstOnCPU.get(p.id) ?? 0) - p.arrival_time;
    return { id: p.id, completion, turnaround, waiting, response };
  });

  const n = processes.length;
  const avgWaiting =
    n === 0
      ? 0
      : Math.round((processMetrics.reduce((s, m) => s + m.waiting, 0) / n) * 100) / 100;
  const avgTurnaround =
    n === 0
      ? 0
      : Math.round(
          (processMetrics.reduce((s, m) => s + m.turnaround, 0) / n) * 100,
        ) / 100;
  const cpuUtilization =
    totalTicks === 0 ? 0 : Math.round((activeTicks / totalTicks) * 10000) / 10000;
  const throughput =
    totalTicks === 0 ? 0 : Math.round((n / totalTicks) * 10000) / 10000;

  const aggregate: AggregateMetrics = {
    avgWaiting,
    avgTurnaround,
    cpuUtilization,
    throughput,
  };

  return { processes: processMetrics, aggregate };
}

// Motor principal del simulador — determinista, sin Math.random ni Date.now
export function run(
  processes: Process[],
  algorithm: IAlgorithm,
  config: SimulationConfig = {},
): SimulationResult {
  // Validación: ráfaga debe ser mayor que 0
  for (const p of processes) {
    if (p.burst_time <= 0) {
      throw new Error('La ráfaga debe ser mayor que 0');
    }
  }

  // Sin procesos → resultado vacío
  if (processes.length === 0) {
    const emptyMetrics: SimulationResult['metrics'] = {
      processes: [],
      aggregate: { avgWaiting: 0, avgTurnaround: 0, cpuUtilization: 0, throughput: 0 },
    };
    return { history: [], intervals: [], metrics: emptyMetrics };
  }

  const quantum = config.quantum ?? 1;
  const isRR = algorithm.preemptionMode === 'on-quantum';
  const isPreemptive = algorithm.preemptionMode === 'on-better';

  // Estado mutable
  const remaining = new Map<string, number>(processes.map((p) => [p.id, p.burst_time]));
  const completedSet = new Set<string>();
  // Procesos aún no llegados (ordenados por arrival_time para eficiencia)
  let pending = [...processes].sort((a, b) => a.arrival_time - b.arrival_time);
  // Cola de listos: FIFO para RR, se reordena antes de select() para otros modos
  let readyQueue: ReadyProcess[] = [];
  let onCPU: string | null = null;
  let quantumUsed = 0;
  // Indica si el proceso en CPU es una nueva selección en este tick (para el mensaje)
  let newSelection = false;

  const historyEvents: HistoryEvent[] = [];
  let tick = 0;

  const procMap = new Map<string, Process>(processes.map((p) => [p.id, p]));

  while (completedSet.size < processes.length) {
    newSelection = false;

    // 1. Recoger llegadas en este tick
    const arrivedNow: Process[] = [];
    const stillPending: Process[] = [];
    for (const p of pending) {
      if (p.arrival_time <= tick) {
        arrivedNow.push(p);
      } else {
        stillPending.push(p);
      }
    }
    pending = stillPending;

    // Ordenar llegadas del mismo tick por id numérico (para consistencia)
    const sortedArrivals = sortByTiebreak(
      arrivedNow.map((p) => toReady(p, remaining.get(p.id) ?? p.burst_time)),
    );

    if (isRR) {
      // 2a. Modo on-quantum (Round Robin)

      // Quantum expirado: añadir llegadas PRIMERO, luego reencolar el proceso actual
      if (onCPU !== null && quantumUsed >= quantum) {
        // Añadir llegadas al final de la cola
        for (const rp of sortedArrivals) {
          readyQueue.push(rp);
        }
        // Reencolar el proceso actual AL FINAL
        const curProc = procMap.get(onCPU);
        const curRem = remaining.get(onCPU) ?? 0;
        if (curProc !== undefined && curRem > 0) {
          readyQueue.push(toReady(curProc, curRem));
        }
        onCPU = null;
        quantumUsed = 0;
      } else {
        // Añadir llegadas al final de la cola normalmente
        for (const rp of sortedArrivals) {
          readyQueue.push(rp);
        }
      }

      // Seleccionar si CPU libre
      if (onCPU === null && readyQueue.length > 0) {
        const selected = readyQueue.shift();
        if (selected !== undefined) {
          onCPU = selected.id;
          quantumUsed = 0;
          newSelection = true;
        }
      }
    } else if (isPreemptive) {
      // 2b. Modo on-better (SRTF, Prioridad expropiativa)

      // Añadir llegadas a la cola
      for (const rp of sortedArrivals) {
        readyQueue.push(rp);
      }

      // Construir candidatos: proceso en CPU (si hay) + cola de listos
      const candidates: ReadyProcess[] = [];
      if (onCPU !== null) {
        const curProc = procMap.get(onCPU);
        const curRem = remaining.get(onCPU) ?? 0;
        if (curProc !== undefined) {
          candidates.push(toReady(curProc, curRem));
        }
      }
      for (const rp of readyQueue) {
        const curRem = remaining.get(rp.id) ?? rp.remaining;
        candidates.push({ ...rp, remaining: curRem });
      }

      if (candidates.length > 0) {
        const sorted = sortByTiebreak(candidates);
        const selected = algorithm.select(sorted);
        if (selected.id !== onCPU) {
          // Expropiar: devolver el actual a la cola
          if (onCPU !== null) {
            const curProc = procMap.get(onCPU);
            const curRem = remaining.get(onCPU) ?? 0;
            if (curProc !== undefined) {
              readyQueue.push(toReady(curProc, curRem));
            }
          }
          onCPU = selected.id;
          readyQueue = readyQueue.filter((r) => r.id !== onCPU);
          newSelection = true;
        }
      }
    } else {
      // 2c. Modo none (no expropiativo)

      // Añadir llegadas a la cola
      for (const rp of sortedArrivals) {
        readyQueue.push(rp);
      }

      // Seleccionar solo si CPU libre
      if (onCPU === null && readyQueue.length > 0) {
        const sorted = sortByTiebreak(readyQueue);
        const selected = algorithm.select(sorted);
        onCPU = selected.id;
        readyQueue = readyQueue.filter((r) => r.id !== onCPU);
        newSelection = true;
      }
    }

    // 3. Ejecutar un tick
    let message: string;

    if (onCPU === null) {
      message = 'CPU inactiva';
      historyEvents.push({
        tick,
        onCPU: null,
        ready: readyQueue.map((r) => r.id),
        pending: pending.map((p) => p.id),
        completed: [...completedSet],
        message,
      });
    } else {
      const rem = remaining.get(onCPU) ?? 0;
      remaining.set(onCPU, rem - 1);
      quantumUsed++;

      const newRem = remaining.get(onCPU) ?? 0;
      if (newRem <= 0) {
        // Proceso completado
        completedSet.add(onCPU);
        // Si es nueva selección (p.ej. re-encola RR), prefijamos MSG_SELECCIONADO para que
        // deriveIntervals pueda romper el intervalo aunque el proceso complete en el mismo tick.
        const completionMsg = `${onCPU} completa en tick ${tick.toString()}`;
        message = newSelection ? `${MSG_SELECCIONADO} ${completionMsg}` : completionMsg;
        historyEvents.push({
          tick,
          onCPU,
          ready: readyQueue.map((r) => r.id),
          pending: pending.map((p) => p.id),
          completed: [...completedSet],
          message,
        });
        onCPU = null;
        quantumUsed = 0;
      } else {
        message = newSelection ? `${MSG_SELECCIONADO} ${onCPU}` : `Ejecutando ${onCPU}`;
        historyEvents.push({
          tick,
          onCPU,
          ready: readyQueue.map((r) => r.id),
          pending: pending.map((p) => p.id),
          completed: [...completedSet],
          message,
        });
      }
    }

    tick++;
  }

  const history: History = historyEvents;
  const intervals = deriveIntervals(history);
  const metrics = deriveMetrics(history, processes);

  return { history, intervals, metrics };
}
