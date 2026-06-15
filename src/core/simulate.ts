import type { Process } from './types/process.js';
import type { IAlgorithm, ReadyProcess } from './types/algorithm.js';
import type { HistoryEvent, History, Interval } from './types/history.js';
import type { SimulationResult, ProcessMetrics, AggregateMetrics } from './types/simulation-result.js';

const MAX_TICKS = 100_000;

export interface SimulationConfig {
  algorithm: IAlgorithm;
  quantum?: number;
}

// ── Desempate ───────────────────────────────────────────────────────────────

// Comparación natural de IDs: "P2" < "P10", "P1A" < "P1B"
function compareIds(a: string, b: string): number {
  const re = /^([A-Za-z]*)(\d+)([A-Za-z]*)$/;
  const ma = re.exec(a);
  const mb = re.exec(b);
  if (ma !== null && mb !== null) {
    const maPrefix = ma[1] ?? '';
    const mbPrefix = mb[1] ?? '';
    const maSuffix = ma[3] ?? '';
    const mbSuffix = mb[3] ?? '';
    if (maPrefix === mbPrefix && maSuffix === mbSuffix) {
      const diff = Number(ma[2]) - Number(mb[2]);
      if (diff !== 0) return diff;
      return maSuffix < mbSuffix ? -1 : maSuffix > mbSuffix ? 1 : 0;
    }
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

// Ordena la lista de candidatos por arrival_time asc → id natural asc (desempate global).
// El algoritmo recibe esta lista ya ordenada y puede aplicar su propio criterio adicional.
function sortReady(ready: ReadyProcess[]): ReadyProcess[] {
  return [...ready].sort((a, b) => {
    const byArrival = a.arrival_time - b.arrival_time;
    if (byArrival !== 0) return byArrival;
    return compareIds(a.id, b.id);
  });
}

// ── Funciones puras de derivación ───────────────────────────────────────────

export function deriveIntervals(history: History): Interval[] {
  const intervals: Interval[] = [];
  for (const event of history) {
    const last = intervals[intervals.length - 1];
    if (last?.pid === event.onCPU) {
      // Extender el intervalo en curso (end es el extremo exclusivo)
      (last as { pid: string | null; start: number; end: number }).end = event.tick + 1;
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
  const totalTime = lastEvent !== undefined ? lastEvent.tick + 1 : 0;

  // completion_time = tick + 1 (extremo exclusivo del intervalo)
  const completionMap = new Map<string, number>();
  for (const event of history) {
    for (const pid of event.completed) {
      if (!completionMap.has(pid)) {
        completionMap.set(pid, event.tick + 1);
      }
    }
  }

  // response_time: primer tick en que el proceso ocupa la CPU
  const responseMap = new Map<string, number>();
  for (const event of history) {
    if (event.onCPU !== null && !responseMap.has(event.onCPU)) {
      responseMap.set(event.onCPU, event.tick);
    }
  }

  const perProcess: ProcessMetrics[] = processes.map((p) => {
    const completion = completionMap.get(p.id) ?? totalTime;
    const turnaround = completion - p.arrival_time;
    const response = (responseMap.get(p.id) ?? p.arrival_time) - p.arrival_time;
    const waiting = turnaround - p.burst_time;
    return { id: p.id, completion, turnaround, waiting, response };
  });

  const n = perProcess.length;
  const avgWaiting = perProcess.reduce((s, m) => s + m.waiting, 0) / n;
  const avgTurnaround = perProcess.reduce((s, m) => s + m.turnaround, 0) / n;
  const activeTicks = history.filter((e) => e.onCPU !== null).length;
  const cpuUtilization = totalTime > 0 ? activeTicks / totalTime : 0;
  const throughput = totalTime > 0 ? n / totalTime : 0;

  return { perProcess, aggregate: { avgWaiting, avgTurnaround, cpuUtilization, throughput } };
}

// ── Helpers internos ─────────────────────────────────────────────────────────

function toReadyProcess(id: string, processes: readonly Process[], remaining: Map<string, number>): ReadyProcess {
  const p = processes.find((x) => x.id === id);
  if (p === undefined) throw new Error(`Proceso desconocido: "${id}"`);
  const rp: ReadyProcess = {
    id: p.id,
    arrival_time: p.arrival_time,
    burst_time: p.burst_time,
    remaining: remaining.get(p.id) ?? 0,
    ...(p.priority !== undefined ? { priority: p.priority } : {}),
  };
  return rp;
}

// ── Motor principal ──────────────────────────────────────────────────────────

export function run(processes: readonly Process[], config: SimulationConfig): SimulationResult {
  // Validación
  for (const p of processes) {
    if (p.burst_time <= 0) {
      throw new Error('La ráfaga debe ser mayor que 0');
    }
  }

  // Caso vacío
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

  const { algorithm, quantum } = config;
  const mode = algorithm.preemptionMode;

  // Estado del motor
  const remaining = new Map<string, number>(processes.map((p) => [p.id, p.burst_time]));
  const pending = new Set<string>(processes.map((p) => p.id));
  const readyQueue: string[] = [];   // FIFO; no contiene el proceso en CPU
  const completed: string[] = [];

  let onCPU: string | null = null;
  let quantumLeft = 0;

  const events: HistoryEvent[] = [];
  let tick = 0;

  while (completed.length < processes.length) {
    if (tick > MAX_TICKS) {
      throw new Error('Se excedió el límite de ticks (100 000). Posible bucle infinito.');
    }

    // ① Incorporar llegadas
    for (const p of processes) {
      if (p.arrival_time === tick && pending.has(p.id)) {
        pending.delete(p.id);
        readyQueue.push(p.id);
      }
    }

    // ② Quantum expiry (on-quantum): las nuevas llegadas ya están en cola
    if (mode === 'on-quantum' && onCPU !== null && quantumLeft === 0) {
      if ((remaining.get(onCPU) ?? 0) > 0) {
        readyQueue.push(onCPU);   // re-encolar después de los recién llegados
      }
      onCPU = null;
    }

    // ③ Selección / expropiación
    if (mode === 'none') {
      if (onCPU === null && readyQueue.length > 0) {
        const candidates = readyQueue.map((id) => toReadyProcess(id, processes, remaining));
        const chosen = algorithm.select(sortReady(candidates));
        const idx = readyQueue.indexOf(chosen.id);
        if (idx !== -1) {
          onCPU = chosen.id;
          readyQueue.splice(idx, 1);
        }
        // Si chosen.id no está en readyQueue (algoritmo defectuoso) → onCPU permanece null
      }
    } else if (mode === 'on-better') {
      const candidateIds: string[] = onCPU !== null ? [...readyQueue, onCPU] : [...readyQueue];
      if (candidateIds.length > 0) {
        const candidates: ReadyProcess[] = candidateIds.map((id) =>
          toReadyProcess(id, processes, remaining),
        );
        const chosen = algorithm.select(sortReady(candidates));
        const validId: string | null = candidateIds.includes(chosen.id) ? chosen.id : null;
        if (validId !== null && validId !== onCPU) {
          // Expropiar: volver a encolar el proceso actual
          if (onCPU !== null) {
            readyQueue.unshift(onCPU);
          }
          const idx = readyQueue.indexOf(validId);
          if (idx !== -1) {
            onCPU = validId;
            readyQueue.splice(idx, 1);
          }
        } else if (onCPU === null && validId !== null) {
          const idx = readyQueue.indexOf(validId);
          if (idx !== -1) {
            onCPU = validId;
            readyQueue.splice(idx, 1);
          }
        }
      }
    } else {
      // mode === 'on-quantum'
      if (onCPU === null && readyQueue.length > 0) {
        onCPU = readyQueue.shift() ?? null;
        quantumLeft = quantum ?? 1;
      }
    }

    // ④ Ejecutar tick
    const executingPid = onCPU;
    let message: string;

    if (executingPid !== null) {
      const rem = (remaining.get(executingPid) ?? 0) - 1;
      remaining.set(executingPid, rem);

      if (rem === 0) {
        completed.push(executingPid);
        onCPU = null;
        quantumLeft = 0;
        message = `${executingPid} finaliza en tick ${String(tick + 1)}`;
      } else {
        if (mode === 'on-quantum') {
          quantumLeft--;
        }
        message = `${executingPid} en CPU (restante: ${String(rem)})`;
      }
    } else {
      message = 'CPU inactiva';
    }

    // ⑤ Registrar evento (onCPU = executingPid, refleja quién ejecutó este tick)
    events.push({
      tick,
      onCPU: executingPid,
      ready: [...readyQueue],
      pending: [...pending],
      completed: [...completed],
      message,
    });

    tick++;
  }

  const history: History = events;
  const intervals = deriveIntervals(history);
  const metrics = deriveMetrics(history, processes);

  return { history, intervals, metrics };
}
