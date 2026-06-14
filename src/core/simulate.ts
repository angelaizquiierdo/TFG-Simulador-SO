// T-07 … T-15 — Motor de simulación tick a tick
import type { Process } from './types/process.js';
import type { IAlgorithm, ReadyProcess } from './types/algorithm.js';
import type { HistoryEvent, Interval } from './types/history.js';
import type { SimulationResult, ProcessMetrics, AggregateMetrics } from './types/simulation-result.js';

/** Configuración para ejecutar una simulación. */
export interface RunConfig {
  algorithm: IAlgorithm;
  params?: { quantum?: number };
}

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** Comparación natural de cadenas: "P2" < "P10". */
function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|([^\d]+)/g;
  const partsA = a.match(re) ?? [];
  const partsB = b.match(re) ?? [];
  const len = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const pa = partsA[i] ?? '';
    const pb = partsB[i] ?? '';
    const na = Number(pa);
    const nb = Number(pb);
    if (!isNaN(na) && !isNaN(nb)) {
      if (na !== nb) return na - nb;
    } else {
      if (pa !== pb) return pa < pb ? -1 : 1;
    }
  }
  return partsA.length - partsB.length;
}

/** Ordena por arrival_time ASC, luego id natural ASC (desempate global). */
function tieBreakSort<T extends { arrival_time: number; id: string }>(arr: T[]): T[] {
  return arr.slice().sort(
    (a, b) => a.arrival_time - b.arrival_time || naturalCompare(a.id, b.id),
  );
}

// ---------------------------------------------------------------------------
// Estado mutable interno del motor (solo dentro de run())
// ---------------------------------------------------------------------------

interface InternalProcess {
  id: string;
  arrival_time: number;
  burst_time: number;
  remaining: number;
  priority?: number;
}

function toReadyProcess(p: InternalProcess): ReadyProcess {
  return p.priority !== undefined
    ? { id: p.id, arrival_time: p.arrival_time, burst_time: p.burst_time, remaining: p.remaining, priority: p.priority }
    : { id: p.id, arrival_time: p.arrival_time, burst_time: p.burst_time, remaining: p.remaining };
}

// ---------------------------------------------------------------------------
// Funciones puras de derivación (T-12)
// ---------------------------------------------------------------------------

/**
 * Colapsa el historial en intervalos consecutivos del mismo pid.
 * pid = null → CPU inactiva.
 */
export function deriveIntervals(history: readonly HistoryEvent[]): readonly Interval[] {
  const intervals: Interval[] = [];
  for (const event of history) {
    const last = intervals[intervals.length - 1];
    const extendLast = last !== undefined ? last.pid === event.onCPU : false;
    if (extendLast && last !== undefined) {
      intervals[intervals.length - 1] = { pid: last.pid, start: last.start, end: event.tick + 1 };
    } else {
      intervals.push({ pid: event.onCPU, start: event.tick, end: event.tick + 1 });
    }
  }
  return intervals;
}

/**
 * Deriva métricas por proceso y agregadas a partir del historial.
 * Nunca se llama dentro del bucle del motor — solo al final de run().
 *
 * Semántica del historial: el evento del tick T registra el estado DESPUÉS
 * de ejecutar ese tick. Por tanto, si un proceso aparece en `completed` en
 * el tick T, su tiempo de finalización es T + 1 (final del slot [T, T+1)).
 */
export function deriveMetrics(
  history: readonly HistoryEvent[],
  processes: readonly Process[],
): SimulationResult['metrics'] {
  const completionMap = new Map<string, number>();
  const firstResponseMap = new Map<string, number>();
  const seenCompleted = new Set<string>();

  for (const event of history) {
    // Primer tick en CPU → tiempo de respuesta
    if (event.onCPU !== null && !firstResponseMap.has(event.onCPU)) {
      firstResponseMap.set(event.onCPU, event.tick);
    }
    // Primer tick en que aparece en completed → completion = tick + 1
    for (const id of event.completed) {
      if (!seenCompleted.has(id)) {
        completionMap.set(id, event.tick + 1);
        seenCompleted.add(id);
      }
    }
  }

  const perProcess: ProcessMetrics[] = processes.map(p => {
    const completion = completionMap.get(p.id) ?? 0;
    const firstResponse = firstResponseMap.get(p.id) ?? p.arrival_time;
    const turnaround = completion - p.arrival_time;
    const waiting = turnaround - p.burst_time;
    const response = firstResponse - p.arrival_time;
    return { id: p.id, completion, turnaround, waiting, response };
  });

  const n = perProcess.length;
  const totalTicks = history.length;
  const busyTicks = history.filter(e => e.onCPU !== null).length;

  const avgWaiting = n > 0 ? perProcess.reduce((s, m) => s + m.waiting, 0) / n : 0;
  const avgTurnaround = n > 0 ? perProcess.reduce((s, m) => s + m.turnaround, 0) / n : 0;
  const cpuUtilization = totalTicks > 0 ? busyTicks / totalTicks : 0;
  const throughput = totalTicks > 0 ? n / totalTicks : 0;

  const aggregate: AggregateMetrics = {
    avgWaiting,
    avgTurnaround,
    cpuUtilization,
    throughput,
  };
  return { perProcess, aggregate };
}

// ---------------------------------------------------------------------------
// Motor principal (T-07 … T-14)
// ---------------------------------------------------------------------------

/**
 * Ejecuta la simulación tick a tick y devuelve el resultado completo.
 *
 * Orden de operaciones por tick:
 *   1. Incorporar llegadas (ordenadas por arrival_time, id para desempate)
 *   2. Gestionar quantum: si expiró el tick anterior → reencolar, liberar CPU
 *   3. Seleccionar proceso para CPU (si libre)
 *   4. Ejecutar: decrementar remaining del proceso en CPU
 *   5. Registrar HistoryEvent (estado DESPUÉS de ejecutar)
 *   6. Limpiar proceso completado (si aplica)
 *   7. Decrementar quantumLeft (si aplica)
 *
 * - Prohibido Math.random() y Date.now() → simulación determinista.
 * - intervals y metrics se derivan al final con funciones puras.
 */
export function run(processes: readonly Process[], config: RunConfig): SimulationResult {
  // T-14 · Configuración inválida
  for (const p of processes) {
    if (p.burst_time <= 0) {
      throw new Error('La ráfaga debe ser mayor que 0');
    }
  }

  // T-14 · Conjunto vacío
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

  const { algorithm, params } = config;
  const quantum = params?.quantum ?? 1;
  const mode = algorithm.preemptionMode;

  // Copias mutables de los procesos
  const procs: InternalProcess[] = processes.map(p =>
    p.priority !== undefined
      ? { id: p.id, arrival_time: p.arrival_time, burst_time: p.burst_time, remaining: p.burst_time, priority: p.priority }
      : { id: p.id, arrival_time: p.arrival_time, burst_time: p.burst_time, remaining: p.burst_time },
  );

  const pendingSet = new Set<string>(procs.map(p => p.id));
  const readyQueue: InternalProcess[] = [];
  const completedList: string[] = [];
  const history: HistoryEvent[] = [];

  let onCPU: InternalProcess | null = null;
  /** Ticks que le quedan al quantum actual. 0 = expirado / no iniciado. */
  let quantumLeft = 0;
  let tick = 0;

  const procById = new Map<string, InternalProcess>(procs.map(p => [p.id, p]));

  while (completedList.length < procs.length) {
    // 1. Incorporar llegadas del tick actual (ordenadas para desempate global)
    const arriving = tieBreakSort(
      procs.filter(p => pendingSet.has(p.id) && p.arrival_time === tick),
    );
    for (const p of arriving) {
      pendingSet.delete(p.id);
      readyQueue.push(p);
    }

    // 2. Gestión de quantum (on-quantum): si expiró en el tick anterior → reencolar
    //    Los procesos que llegan en este tick (paso 1) ya están en ready ANTES del reencolado.
    if (mode === 'on-quantum' && onCPU !== null && quantumLeft <= 0) {
      readyQueue.push(onCPU);
      onCPU = null;
    }

    // 3. Seleccionar proceso para CPU
    if (mode === 'none') {
      // No expropiativo: seleccionar solo cuando CPU libre
      if (onCPU === null && readyQueue.length > 0) {
        const sorted = tieBreakSort(readyQueue).map(toReadyProcess);
        const selected = algorithm.select(sorted);
        const idx = readyQueue.findIndex(p => p.id === selected.id);
        if (idx !== -1) readyQueue.splice(idx, 1);
        onCPU = procById.get(selected.id) ?? null;
      }
    } else if (mode === 'on-better') {
      // Expropiativo por mejor proceso: reevaluar cada tick incluyendo el proceso en CPU
      const candidates: InternalProcess[] =
        onCPU !== null ? [...readyQueue, onCPU] : [...readyQueue];
      if (candidates.length > 0) {
        const sorted = tieBreakSort(candidates).map(toReadyProcess);
        const selected = algorithm.select(sorted);
        const winner = procById.get(selected.id);
        if (winner !== undefined && winner !== onCPU) {
          if (onCPU !== null) readyQueue.push(onCPU);
          const idx = readyQueue.findIndex(p => p.id === winner.id);
          if (idx !== -1) readyQueue.splice(idx, 1);
          onCPU = winner;
        }
      }
    } else {
      // on-quantum: seleccionar si CPU libre
      if (onCPU === null && readyQueue.length > 0) {
        const selected = algorithm.select(readyQueue.map(toReadyProcess));
        const idx = readyQueue.findIndex(p => p.id === selected.id);
        if (idx !== -1) readyQueue.splice(idx, 1);
        onCPU = procById.get(selected.id) ?? null;
        quantumLeft = quantum;
      }
    }

    // 4. Ejecutar tick: decrementar remaining del proceso en CPU
    if (onCPU !== null) {
      onCPU.remaining -= 1;
    }

    // 5. Registrar HistoryEvent DESPUÉS de ejecutar
    const pendingIds = [...pendingSet].sort(
      (a, b) => {
        const pa = procById.get(a);
        const pb = procById.get(b);
        if (pa === undefined || pb === undefined) return 0;
        return pa.arrival_time - pb.arrival_time || naturalCompare(a, b);
      },
    );

    // ¿Se ha completado el proceso en CPU en esta ejecución?
    const justCompleted = onCPU !== null && onCPU.remaining <= 0;
    if (justCompleted && onCPU !== null) {
      completedList.push(onCPU.id);
    }

    let message: string;
    if (onCPU === null) {
      message = pendingIds.length > 0
        ? `Tick ${String(tick)}: CPU inactiva. Próximas llegadas: ${pendingIds.join(', ')}.`
        : `Tick ${String(tick)}: CPU inactiva.`;
    } else {
      message = justCompleted
        ? `Tick ${String(tick)}: ${onCPU.id} finaliza.`
        : `Tick ${String(tick)}: ${onCPU.id} en CPU (restante: ${String(onCPU.remaining)}).`;
    }

    history.push({
      tick,
      onCPU: onCPU?.id ?? null,
      ready: readyQueue.map(p => p.id),
      pending: pendingIds,
      completed: [...completedList],
      message,
    });

    // 6. Limpiar proceso completado
    if (justCompleted) {
      onCPU = null;
      quantumLeft = 0;
    }

    // 7. Decrementar quantum (si el proceso sigue en CPU)
    if (mode === 'on-quantum' && onCPU !== null) {
      quantumLeft -= 1;
    }

    tick += 1;

    // Seguridad contra bucle infinito
    if (tick > 100_000) {
      throw new Error('La simulación excedió el límite de ticks.');
    }
  }

  // 8. Derivar intervals y metrics con funciones puras (T-12)
  const intervals = deriveIntervals(history);
  const metrics = deriveMetrics(history, processes);

  return { history, intervals, metrics };
}
