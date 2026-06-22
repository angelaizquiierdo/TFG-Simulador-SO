import type { Process } from './types/process.js';
import type { IAlgorithm, ReadyProcess, SchedulerEvent } from './types/algorithm.js';
import type { HistoryEvent, Interval } from './types/history.js';
import type { SchedulerState } from './types/scheduler-state.js';
import type { SimulationResult, ProcessMetrics, AggregateMetrics } from './types/simulation-result.js';

export interface RunConfig {
  algorithm: IAlgorithm;
  quantum?: number;
  params?: Readonly<Record<string, unknown>>;
}

const MAX_TICKS = 100_000;

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function validateProcesses(processes: readonly Process[], algo: IAlgorithm): void {
  for (const p of processes) {
    if (p.arrival_time < 0)
      throw new Error(`Proceso "${p.id}": arrival_time debe ser >= 0`);
    if (p.burst_time <= 0)
      throw new Error(`Proceso "${p.id}": burst_time debe ser > 0`);
    if (algo.requires.priority === true && p.priority === undefined)
      throw new Error(`Proceso "${p.id}": falta el campo priority`);
    if (algo.requires.io === true && p.io) {
      let last = 0;
      let hasLast = false;
      for (const op of p.io) {
        if (op.io_entry <= 0)
          throw new Error(`Proceso "${p.id}": io_entry debe ser > 0`);
        if (op.io_entry >= p.burst_time)
          throw new Error(`Proceso "${p.id}": io_entry debe ser < burst_time`);
        if (op.io_time <= 0)
          throw new Error(`Proceso "${p.id}": io_time debe ser > 0`);
        if (hasLast && op.io_entry <= last)
          throw new Error(`Proceso "${p.id}": io_entry debe ser estrictamente creciente`);
        last = op.io_entry;
        hasLast = true;
      }
    }
  }
}

function toReadyProcess(p: Process, rem: number): ReadyProcess {
  return {
    id: p.id,
    arrival_time: p.arrival_time,
    burst_time: p.burst_time,
    remaining: rem,
    ...(p.priority !== undefined ? { priority: p.priority } : {}),
  };
}

function emitToAlgo(algo: IAlgorithm, event: SchedulerEvent): string | null {
  return algo.onEvent ? algo.onEvent(event) : null;
}

function genericMsg(event: SchedulerEvent): string {
  switch (event.type) {
    case 'dispatch':       return `${event.id} entra en CPU`;
    case 'completed':      return `${event.id} completa en tick ${String(event.tick)}`;
    case 'quantum-expiry': return `${event.id} agota su quantum`;
    case 'preempted':      return `${event.id} es expropiado`;
    case 'io-start':       return `${event.id} inicia E/S`;
    case 'io-return':      return `${event.id} vuelve de E/S`;
    case 'arrival':        return `${event.id} llega`;
    case 'priority-boost': return 'Priority boost: todos los procesos suben al nivel 0';
  }
}

function emptyResult(): SimulationResult {
  return {
    history: [],
    intervals: [],
    metrics: [],
    aggregateMetrics: { avgWaiting: 0, avgTurnaround: 0, cpuUtilization: 0, throughput: 0 },
  };
}

// ────────────────────────────────────────────────────────────
// Derivación de intervalos (función pura sobre el historial)
// ────────────────────────────────────────────────────────────

export function deriveIntervals(history: readonly HistoryEvent[]): readonly Interval[] {
  if (history.length === 0) return [];
  const out: Interval[] = [];
  let curPid: string | null = null;
  let curStart = 0;
  let first = true;

  for (const ev of history) {
    if (first) {
      curPid = ev.onCPU;
      curStart = ev.tick;
      first = false;
    } else if (ev.onCPU !== curPid) {
      out.push({ pid: curPid, start: curStart, end: ev.tick });
      curPid = ev.onCPU;
      curStart = ev.tick;
    }
  }
  if (!first) {
    const last = history[history.length - 1];
    if (last !== undefined && curStart < last.tick) {
      out.push({ pid: curPid, start: curStart, end: last.tick });
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// Derivación de métricas por proceso (función pura)
// ────────────────────────────────────────────────────────────

export function deriveProcessMetrics(
  history: readonly HistoryEvent[],
  processes: readonly Process[],
): readonly ProcessMetrics[] {
  if (processes.length === 0) return [];

  const completionOf = new Map<string, number>();
  const firstCPUOf = new Map<string, number>();
  const cpuTicksOf = new Map<string, number>();
  const ioTicksOf = new Map<string, number>();

  for (const p of processes) {
    cpuTicksOf.set(p.id, 0);
    ioTicksOf.set(p.id, 0);
  }

  for (const ev of history) {
    if (ev.onCPU !== null) {
      const pid = ev.onCPU;
      if (!firstCPUOf.has(pid)) firstCPUOf.set(pid, ev.tick);
      cpuTicksOf.set(pid, (cpuTicksOf.get(pid) ?? 0) + 1);
    }
    if (ev.inIO !== null) {
      ioTicksOf.set(ev.inIO, (ioTicksOf.get(ev.inIO) ?? 0) + 1);
    }
    for (const pid of ev.waitingIO) {
      ioTicksOf.set(pid, (ioTicksOf.get(pid) ?? 0) + 1);
    }
    for (const pid of ev.completed) {
      if (!completionOf.has(pid)) completionOf.set(pid, ev.tick);
    }
  }

  return processes.map(p => {
    const completion = completionOf.get(p.id) ?? 0;
    const turnaround = completion - p.arrival_time;
    const cpuTotal = cpuTicksOf.get(p.id) ?? 0;
    const ioTotal = ioTicksOf.get(p.id) ?? 0;
    const waiting = turnaround - cpuTotal - ioTotal;
    const firstTick = firstCPUOf.get(p.id) ?? completion;
    const response = firstTick - p.arrival_time;
    return { id: p.id, completion, turnaround, waiting, response };
  });
}

// ────────────────────────────────────────────────────────────
// Derivación de métricas agregadas (función pura)
// ────────────────────────────────────────────────────────────

export function deriveAggregateMetrics(
  history: readonly HistoryEvent[],
  metrics: readonly ProcessMetrics[],
): AggregateMetrics {
  if (metrics.length === 0)
    return { avgWaiting: 0, avgTurnaround: 0, cpuUtilization: 0, throughput: 0 };

  const last = history[history.length - 1];
  const makespan = last?.tick ?? 0;
  const avgWaiting = metrics.reduce((s, m) => s + m.waiting, 0) / metrics.length;
  const avgTurnaround = metrics.reduce((s, m) => s + m.turnaround, 0) / metrics.length;
  const cpuBusy = history.filter(e => e.onCPU !== null && e.tick < makespan).length;
  const cpuUtilization = makespan > 0 ? cpuBusy / makespan : 0;
  const throughput = makespan > 0 ? metrics.length / makespan : 0;
  return { avgWaiting, avgTurnaround, cpuUtilization, throughput };
}

// ────────────────────────────────────────────────────────────
// Estado mutable del bucle (objeto para evitar narrowing de TypeScript)
// ────────────────────────────────────────────────────────────

interface LoopState {
  onCPU: string | null;
  quantumLeft: number;
  // E/S
  deviceServing: string | null;
  deviceRemaining: number;
  deviceQueue: string[];
  // Mensajes
  tickMessage: string;
  // Pendientes para el próximo tick
  ioReturnsPending: string[];
  quantumRequeue: string | null;
}

// ────────────────────────────────────────────────────────────
// Bucle principal del motor
// ────────────────────────────────────────────────────────────

function executeLoop(
  algo: IAlgorithm,
  config: RunConfig,
  processMap: ReadonlyMap<string, Process>,
  remaining: Map<string, number>,
  completedList: string[],
  pendingList: string[],   // mutable, se hace shift
  readyList: string[],     // mutable
  readySet: Set<string>,   // mutable
  ls: LoopState,
  boostInterval: number | null,
  nextIOIdx: Map<string, number>,
  ioTimeForPid: Map<string, number>, // io_time guardado al iniciar E/S
  totalProcesses: number,
  startTick: number,
): readonly HistoryEvent[] {
  const withIO = algo.requires.io === true;

  const addToReady = (pid: string): void => {
    if (!readySet.has(pid)) { readySet.add(pid); readyList.push(pid); }
  };
  const removeFromReady = (pid: string): void => {
    readySet.delete(pid);
    const i = readyList.indexOf(pid);
    if (i >= 0) readyList.splice(i, 1);
  };
  const buildRP = (): ReadyProcess[] =>
    readyList.map(id => {
      const p = processMap.get(id);
      const rem = remaining.get(id) ?? 0;
      if (p === undefined) return { id, arrival_time: 0, burst_time: 1, remaining: rem };
      return toReadyProcess(p, rem);
    });
  const trySelect = (): string | null => {
    if (readyList.length === 0) return null;
    try {
      const chosen = algo.select(buildRP());
      return readySet.has(chosen.id) ? chosen.id : null;
    } catch { return null; }
  };
  const getQuantumFor = (pid: string): number => {
    if (algo.quantumFor) {
      const p = processMap.get(pid);
      if (p !== undefined) {
        const q = algo.quantumFor(toReadyProcess(p, remaining.get(pid) ?? 0));
        if (q !== null) return q;
      }
    }
    return config.quantum ?? Infinity;
  };
  const doDispatch = (pid: string, tick: number): string => {
    removeFromReady(pid);
    ls.onCPU = pid;
    ls.quantumLeft = getQuantumFor(pid);
    const ev: SchedulerEvent = { type: 'dispatch', id: pid, tick };
    return emitToAlgo(algo, ev) ?? genericMsg(ev);
  };

  const history: HistoryEvent[] = [];
  let tick = startTick;
  const maxTick = startTick + MAX_TICKS;

  while (completedList.length < totalProcesses) {
    if (tick > maxTick)
      throw new Error(`Límite de ${String(MAX_TICKS)} ticks excedido. Posible bucle infinito.`);

    let msg = '';

    // ── A. io-returns del tick anterior (orden: id asc) ──
    const ioReturnIds = [...ls.ioReturnsPending].sort(naturalCompare);
    ls.ioReturnsPending = [];
    for (const pid of ioReturnIds) {
      const m = emitToAlgo(algo, { type: 'io-return', id: pid, tick });
      if (m !== null && !msg) msg = m;
    }

    // ── B. Nuevas llegadas en tick T ──
    const arrivals: string[] = [];
    while (pendingList.length > 0) {
      const nxt = pendingList[0];
      if (nxt === undefined) break;
      const p = processMap.get(nxt);
      if (p === undefined || p.arrival_time > tick) break;
      pendingList.shift();
      arrivals.push(nxt);
      emitToAlgo(algo, { type: 'arrival', id: nxt, tick });
    }

    // ── C. Quantum requeue del tick anterior ──
    const qRequeue = ls.quantumRequeue;
    ls.quantumRequeue = null;

    // ── D. Modo io-return: expropiar si vuelve proceso de E/S ──
    if (algo.preemptionMode === 'io-return' && ioReturnIds.length > 0 && ls.onCPU !== null) {
      const pid = ls.onCPU;
      const m = emitToAlgo(algo, { type: 'preempted', id: pid, tick });
      if (m !== null) msg = m;
      addToReady(pid);
      ls.onCPU = null;
    }

    // ── E. Priority boost (on-quantum-and-better) ──
    if (
      boostInterval !== null &&
      tick > 0 &&
      tick % boostInterval === 0 &&
      algo.preemptionMode === 'on-quantum-and-better'
    ) {
      const m = emitToAlgo(algo, { type: 'priority-boost', tick });
      msg = m ?? genericMsg({ type: 'priority-boost', tick });
      if (ls.onCPU !== null) {
        addToReady(ls.onCPU);
        ls.onCPU = null;
      }
    }

    // ── F. Insertar en ready: io-return → llegadas → quantum-requeue ──
    for (const pid of ioReturnIds) addToReady(pid);
    for (const pid of arrivals) addToReady(pid);
    if (qRequeue !== null) addToReady(qRequeue);

    // ── G. Selección ──
    if (ls.onCPU === null) {
      const chosen = trySelect();
      if (chosen !== null) {
        const m = doDispatch(chosen, tick);
        if (!msg) msg = m;
      } else if (!msg) {
        msg = 'CPU inactiva';
      }
    } else if (
      algo.preemptionMode === 'on-better' ||
      algo.preemptionMode === 'on-quantum-and-better'
    ) {
      if (readyList.length > 0) {
        // Incluir onCPU temporalmente para re-evaluar
        const currentCPU = ls.onCPU;
        addToReady(currentCPU);
        const chosen = trySelect();
        if (chosen !== null && chosen !== currentCPU) {
          // Expropiar
          removeFromReady(currentCPU);
          addToReady(currentCPU); // re-insertar al final de ready
          ls.onCPU = null;
          const pm = emitToAlgo(algo, { type: 'preempted', id: currentCPU, tick });
          const dm = doDispatch(chosen, tick);
          msg = pm ?? dm;
        } else {
          // Sin preemption: retirar de ready
          removeFromReady(currentCPU);
        }
      }
    }

    // ── H. Registrar HistoryEvent[T] ──
    history.push({
      tick,
      onCPU: ls.onCPU,
      ready: [...readyList],
      pending: [...pendingList],
      completed: [...completedList],
      inIO: withIO ? ls.deviceServing : null,
      waitingIO: withIO ? [...ls.deviceQueue] : [],
      message: msg || ls.tickMessage,
    });
    if (msg) ls.tickMessage = msg;

    // ── I. Consumir CPU ──
    if (ls.onCPU !== null) {
      remaining.set(ls.onCPU, (remaining.get(ls.onCPU) ?? 0) - 1);
      ls.quantumLeft--;
    }

    // ── J. Consumir IO ──
    if (withIO && ls.deviceServing !== null) {
      ls.deviceRemaining--;
      if (ls.deviceRemaining <= 0) {
        const returned = ls.deviceServing;
        ls.deviceServing = null;
        ls.ioReturnsPending.push(returned);
        // Admitir siguiente de cola FCFS
        const nextInQueue = ls.deviceQueue.shift();
        if (nextInQueue !== undefined) {
          ls.deviceServing = nextInQueue;
          ls.deviceRemaining = ioTimeForPid.get(nextInQueue) ?? 1;
        }
      }
    }

    // ── K. Fin de tramo CPU (io-start > completion > quantum) ──
    if (ls.onCPU !== null) {
      const pid = ls.onCPU;
      const rem = remaining.get(pid) ?? 0;
      let done = false;

      if (withIO) {
        const ioIdx = nextIOIdx.get(pid) ?? 0;
        const p = processMap.get(pid);
        const ioOp = p?.io?.[ioIdx];
        if (ioOp !== undefined) {
          const cpuSoFar = (p?.burst_time ?? 0) - rem;
          if (cpuSoFar === ioOp.io_entry) {
            nextIOIdx.set(pid, ioIdx + 1);
            const ev: SchedulerEvent = { type: 'io-start', id: pid, tick: tick + 1 };
            ls.tickMessage = emitToAlgo(algo, ev) ?? genericMsg(ev);
            // Guardar io_time para este proceso
            ioTimeForPid.set(pid, ioOp.io_time);
            if (ls.deviceServing === null) {
              ls.deviceServing = pid;
              ls.deviceRemaining = ioOp.io_time;
            } else {
              ls.deviceQueue.push(pid);
            }
            ls.onCPU = null;
            done = true;
          }
        }
      }

      if (!done && rem === 0) {
        completedList.push(pid);
        const ev: SchedulerEvent = { type: 'completed', id: pid, tick: tick + 1 };
        ls.tickMessage = emitToAlgo(algo, ev) ?? genericMsg(ev);
        ls.onCPU = null;
        done = true;
      }

      if (!done && ls.quantumLeft === 0) {
        ls.quantumRequeue = pid;
        const ev: SchedulerEvent = { type: 'quantum-expiry', id: pid, tick: tick + 1 };
        ls.tickMessage = emitToAlgo(algo, ev) ?? genericMsg(ev);
        ls.onCPU = null;
      }
    }

    tick++;
  }

  // Estado terminal
  history.push({
    tick,
    onCPU: null,
    ready: [],
    pending: [],
    completed: [...completedList],
    inIO: null,
    waitingIO: [],
    message: 'Simulación completa: todos los procesos finalizados',
  });

  return history;
}

// ────────────────────────────────────────────────────────────
// run() — simulación completa desde cero
// ────────────────────────────────────────────────────────────

export function run(processes: readonly Process[], config: RunConfig): SimulationResult {
  if (processes.length === 0) return emptyResult();

  const algo = config.algorithm;
  validateProcesses(processes, algo);

  const processMap = new Map<string, Process>();
  for (const p of processes) processMap.set(p.id, p);

  const remaining = new Map<string, number>();
  for (const p of processes) remaining.set(p.id, p.burst_time);

  const completedList: string[] = [];

  const pendingList: string[] = [...processes]
    .sort((a, b) => a.arrival_time - b.arrival_time || naturalCompare(a.id, b.id))
    .map(p => p.id);

  const readyList: string[] = [];
  const readySet = new Set<string>();

  const ls: LoopState = {
    onCPU: null,
    quantumLeft: 0,
    deviceServing: null,
    deviceRemaining: 0,
    deviceQueue: [],
    tickMessage: 'CPU inactiva',
    ioReturnsPending: [],
    quantumRequeue: null,
  };

  const boostInterval =
    typeof config.params?.boostInterval === 'number' && config.params.boostInterval > 0
      ? config.params.boostInterval
      : null;

  const nextIOIdx = new Map<string, number>();
  for (const p of processes) nextIOIdx.set(p.id, 0);

  const ioTimeForPid = new Map<string, number>();

  const history = executeLoop(
    algo, config, processMap, remaining, completedList,
    pendingList, readyList, readySet, ls,
    boostInterval, nextIOIdx, ioTimeForPid,
    processes.length, 0,
  );

  const intervals = deriveIntervals(history);
  const metrics = deriveProcessMetrics(history, processes);
  const aggregateMetrics = deriveAggregateMetrics(history, metrics);

  return { history, intervals, metrics, aggregateMetrics };
}

// ────────────────────────────────────────────────────────────
// runFrom() — what-if e inyección en vivo
// ────────────────────────────────────────────────────────────

export function runFrom(
  state: SchedulerState,
  config: RunConfig,
  allProcesses: readonly Process[],
): SimulationResult {
  const startTick = state.tick;
  const algo = config.algorithm;

  const processMap = new Map<string, Process>();
  for (const p of allProcesses) processMap.set(p.id, p);

  const inReadyOrCPU = new Set<string>([
    ...state.ready,
    ...(state.onCPU !== null ? [state.onCPU] : []),
  ]);

  // Validar inyección
  for (const p of allProcesses) {
    if (state.completed.includes(p.id)) continue;
    if (!inReadyOrCPU.has(p.id) && p.arrival_time < startTick) {
      throw new Error(
        `Inyección inválida: proceso "${p.id}" tiene arrival_time ` +
          `${String(p.arrival_time)} < tick actual ${String(startTick)}`,
      );
    }
    if (p.burst_time <= 0) throw new Error(`Proceso "${p.id}": burst_time debe ser > 0`);
    if (p.arrival_time < 0) throw new Error(`Proceso "${p.id}": arrival_time debe ser >= 0`);
  }

  const remaining = new Map<string, number>(Object.entries(state.remainingBurst));
  for (const p of allProcesses) {
    if (!remaining.has(p.id)) remaining.set(p.id, p.burst_time);
  }

  const completedList: string[] = [...state.completed];

  const pendingList: string[] = allProcesses
    .filter(p => !completedList.includes(p.id) && !inReadyOrCPU.has(p.id))
    .sort((a, b) => a.arrival_time - b.arrival_time || naturalCompare(a.id, b.id))
    .map(p => p.id);

  const readyList: string[] = [...state.ready];
  const readySet = new Set<string>(readyList);

  const ls: LoopState = {
    onCPU: state.onCPU,
    quantumLeft: state.onCPU !== null ? (config.quantum ?? Infinity) : 0,
    deviceServing: state.inIO,
    deviceRemaining: state.inIO !== null ? 1 : 0,
    deviceQueue: [...state.waitingIO],
    tickMessage: 'CPU inactiva',
    ioReturnsPending: [],
    quantumRequeue: null,
  };

  const boostInterval =
    typeof config.params?.boostInterval === 'number' && config.params.boostInterval > 0
      ? config.params.boostInterval
      : null;

  const nextIOIdx = new Map<string, number>();
  for (const p of allProcesses) {
    const consumed = p.burst_time - (remaining.get(p.id) ?? p.burst_time);
    let idx = 0;
    if (p.io) {
      for (const op of p.io) {
        if (consumed >= op.io_entry) idx++;
        else break;
      }
    }
    nextIOIdx.set(p.id, idx);
  }

  const ioTimeForPid = new Map<string, number>();

  const history = executeLoop(
    algo, config, processMap, remaining, completedList,
    pendingList, readyList, readySet, ls,
    boostInterval, nextIOIdx, ioTimeForPid,
    allProcesses.length, startTick,
  );

  const intervals = deriveIntervals(history);
  const metrics = deriveProcessMetrics(history, allProcesses);
  const aggregateMetrics = deriveAggregateMetrics(history, metrics);

  return { history, intervals, metrics, aggregateMetrics };
}
