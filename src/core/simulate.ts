import type { Process } from './types/process.js';
import type { IAlgorithm, ReadyProcess } from './types/algorithm.js';
import type { HistoryEvent, History, Interval } from './types/history.js';
import type { SimulationResult, ProcessMetrics, AggregateMetrics } from './types/simulation-result.js';
import { get } from './registry.js';

const MAX_TICKS = 100_000;

// Configuración de la simulación
export interface SimulationConfig {
  algorithm: string;
  params?: { quantum?: number };
}

// Comparador de IDs con orden natural (evita que P10 < P2)
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Pre-ordena por desempate global (arrival_time ASC, id natural ASC)
// Esto garantiza que al llamar a select() las colas tienen ties ya resueltos.
function desempateSort(procs: ReadyProcess[]): ReadyProcess[] {
  return [...procs].sort((a, b) => {
    if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
    return naturalCompare(a.id, b.id);
  });
}

// Deriva los intervalos (tramos continuos de CPU o inactividad) a partir del historial.
// Un evento con mensaje "Seleccionado: X" inicia un nuevo intervalo aunque el pid no cambie
// (cubre el caso de Round Robin donde un proceso se re-selecciona tras expirar su quantum).
export function deriveIntervals(history: History): Interval[] {
  const intervals: Interval[] = [];
  let current: { pid: string | null; start: number } | null = null;

  for (const event of history) {
    const pid = event.onCPU;
    const isNewSelection = event.message.startsWith('Seleccionado:');
    if (current === null) {
      current = { pid, start: event.tick };
    } else if (pid !== current.pid || isNewSelection) {
      intervals.push({ pid: current.pid, start: current.start, end: event.tick });
      current = { pid, start: event.tick };
    }
  }

  if (current !== null) {
    const last = history[history.length - 1];
    if (last !== undefined) {
      intervals.push({ pid: current.pid, start: current.start, end: last.tick + 1 });
    }
  }

  return intervals;
}

// Deriva las métricas de cada proceso y las métricas agregadas
export function deriveMetrics(
  history: History,
  processes: readonly Process[],
): SimulationResult['metrics'] {
  if (history.length === 0 || processes.length === 0) {
    return {
      perProcess: [],
      aggregate: { avgWaiting: 0, avgTurnaround: 0, cpuUtilization: 0, throughput: 0 },
    };
  }

  const totalTicks = history.length;
  const firstOnCPU = new Map<string, number>();
  const completionTick = new Map<string, number>();
  let cpuActiveTicks = 0;

  for (const event of history) {
    if (event.onCPU !== null) {
      cpuActiveTicks++;
      if (!firstOnCPU.has(event.onCPU)) {
        firstOnCPU.set(event.onCPU, event.tick);
      }
    }
    for (const pid of event.completed) {
      if (!completionTick.has(pid)) {
        // El proceso completa al finalizar el tick en que aparece como completado
        completionTick.set(pid, event.tick + 1);
      }
    }
  }

  const perProcess: ProcessMetrics[] = processes.map((p) => {
    const completion = completionTick.get(p.id) ?? totalTicks;
    const turnaround = completion - p.arrival_time;
    const waiting = turnaround - p.burst_time;
    const responseFirst = firstOnCPU.get(p.id) ?? completion;
    const response = responseFirst - p.arrival_time;
    return { id: p.id, completion, turnaround, waiting, response };
  });

  const n = perProcess.length;
  const avgWaiting = perProcess.reduce((s, m) => s + m.waiting, 0) / n;
  const avgTurnaround = perProcess.reduce((s, m) => s + m.turnaround, 0) / n;
  const cpuUtilization = totalTicks > 0 ? cpuActiveTicks / totalTicks : 0;
  const throughput = totalTicks > 0 ? n / totalTicks : 0;

  const aggregate: AggregateMetrics = { avgWaiting, avgTurnaround, cpuUtilization, throughput };
  return { perProcess, aggregate };
}

// Motor principal de simulación
export function run(processes: readonly Process[], config: SimulationConfig): SimulationResult {
  // Validar ráfagas
  for (const p of processes) {
    if (p.burst_time <= 0) {
      throw new Error('La ráfaga debe ser mayor que 0');
    }
  }

  // Sin procesos: resultado vacío
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

  const algo: IAlgorithm = get(config.algorithm);
  const quantum = config.params?.quantum ?? 1;

  // Ráfagas restantes por proceso
  const remaining = new Map<string, number>(processes.map((p) => [p.id, p.burst_time]));

  // Grupos de procesos
  const pending = new Set<string>(processes.map((p) => p.id));
  // Para RR: ready es una cola FIFO (orden de inserción).
  // Para none/on-better: ready se re-ordena en cada selección.
  let ready: string[] = [];
  let completed: string[] = [];

  let onCPU: string | null = null;
  let quantumLeft = 0;

  const history: HistoryEvent[] = [];
  let tick = 0;

  const toReadyProcess = (id: string): ReadyProcess => {
    const p = processes.find((proc) => proc.id === id);
    if (p === undefined) throw new Error(`Proceso ${id} no encontrado`);
    const base = {
      id: p.id,
      arrival_time: p.arrival_time,
      burst_time: p.burst_time,
      remaining: remaining.get(id) ?? 0,
    };
    return p.priority !== undefined ? { ...base, priority: p.priority } : base;
  };

  // Selecciona el mejor proceso de la cola usando pre-ordenación por desempate + select().
  // Solo para modos 'none' y 'on-better'.
  const selectBest = (ids: string[]): string | null => {
    if (ids.length === 0) return null;
    const procs = desempateSort(ids.map(toReadyProcess));
    const winner = algo.select(procs);
    // Verificar que el ID devuelto existe en la lista
    if (ids.includes(winner.id)) return winner.id;
    return null; // algoritmo malicioso: devolvió un ID que no existe
  };

  while (completed.length < processes.length) {
    if (tick >= MAX_TICKS) {
      throw new Error(`Se excedió el límite de ${MAX_TICKS.toString()} ticks`);
    }

    // 1. Incorporar llegadas (siempre antes de cualquier reencolado)
    const newArrivals: string[] = [];
    for (const id of pending) {
      const p = processes.find((proc) => proc.id === id);
      if (p !== undefined && p.arrival_time <= tick) {
        newArrivals.push(id);
      }
    }
    // Orden determinista de llegadas simultáneas
    newArrivals.sort((a, b) => naturalCompare(a, b));
    for (const id of newArrivals) {
      pending.delete(id);
      ready.push(id);
    }

    // 2. Gestión de la expropiación según modo
    if (algo.preemptionMode === 'on-quantum' && onCPU !== null) {
      // Round Robin: el quantum se consume cada tick
      quantumLeft--;
      if (quantumLeft <= 0) {
        // Quantum agotado: reencolar DESPUÉS de las nuevas llegadas (ya añadidas)
        const rem = remaining.get(onCPU) ?? 0;
        if (rem > 0) {
          ready.push(onCPU);
        }
        onCPU = null;
      }
    } else if (algo.preemptionMode === 'on-better' && onCPU !== null) {
      // Expropiativo por mejor: comparar proceso actual con el mejor disponible
      if (ready.length > 0) {
        // Candidatos: todos los disponibles incluyendo el proceso actual
        const allIds = [onCPU, ...ready];
        const bestId = selectBest(allIds);
        if (bestId !== null && bestId !== onCPU) {
          // Hay un proceso mejor → expropiar el actual
          ready.push(onCPU);
          onCPU = null;
        }
      }
    }
    // 'none': no expropiar; la CPU se libera solo cuando el proceso termina

    // 3. Si la CPU está libre, seleccionar el siguiente proceso
    let message = '';
    if (onCPU === null) {
      if (ready.length > 0) {
        let selectedId: string | null;
        if (algo.preemptionMode === 'on-quantum') {
          // RR: FIFO — primer elemento de la cola
          selectedId = ready[0] ?? null;
          ready = ready.slice(1);
        } else {
          // none / on-better: seleccionar según criterio del algoritmo
          selectedId = selectBest(ready);
          if (selectedId !== null) {
            ready = ready.filter((id) => id !== selectedId);
          }
        }

        if (selectedId !== null && remaining.has(selectedId)) {
          onCPU = selectedId;
          quantumLeft = quantum;
          message = `Seleccionado: ${onCPU}`;
        } else {
          // Algoritmo malicioso o null: CPU inactiva
          message = 'CPU inactiva';
        }
      } else {
        message = 'CPU inactiva';
      }
    }

    // 4. Ejecutar un tick sobre el proceso en CPU
    // cpuDuringTick refleja quién estuvo en CPU DURANTE este tick (incluso si completa al final)
    const cpuDuringTick: string | null = onCPU;
    if (onCPU !== null) {
      const rem = remaining.get(onCPU);
      if (rem === undefined) {
        // Protección: proceso inválido
        onCPU = null;
        message = 'CPU inactiva';
      } else {
        remaining.set(onCPU, rem - 1);
        if (message === '') message = `Ejecutando: ${onCPU}`;
      }
    }

    // 5. Verificar si el proceso en CPU completó
    if (onCPU !== null && (remaining.get(onCPU) ?? 1) === 0) {
      completed = [...completed, onCPU];
      // Si este tick también fue una re-selección (ej. RR reencola e inmediatamente
      // re-selecciona), preservar el prefijo "Seleccionado:" para que deriveIntervals
      // pueda detectar el límite de intervalo.
      const completionMsg = `${onCPU} completa en tick ${(tick + 1).toString()}`;
      message = message.startsWith('Seleccionado:')
        ? `${message}; ${completionMsg}`
        : completionMsg;
      onCPU = null;
    }

    // 6. Registrar el evento del tick
    history.push({
      tick,
      onCPU: cpuDuringTick,
      ready: [...ready],
      pending: [...pending].sort((a, b) => naturalCompare(a, b)),
      completed: [...completed],
      message,
    });

    tick++;
  }

  const finalHistory: History = history;
  const intervals = deriveIntervals(finalHistory);
  const metrics = deriveMetrics(finalHistory, processes);

  return { history: finalHistory, intervals, metrics };
}
