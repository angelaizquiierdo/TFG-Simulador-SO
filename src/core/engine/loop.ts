import type { Process } from '../types/process.js';
import type { IAlgorithm, ReadyProcess } from '../types/algorithm.js';
import type { HistoryEvent } from '../types/history.js';
import { IOSubsystem } from '../io-subsystem.js';

// Estado mutable inicial del bucle principal
interface LoopState {
  tick: number;
  onCPU: string | null;
  ready: string[];
  pending: string[];
  completed: string[];
}

// Resuelve el retorno de onEvent a string plano (T-18)
// Si es { text }, formatea como "pid text". Si es string, lo devuelve. Si es null, devuelve null.
function resolveMsg(
  raw: string | { text: string } | null | undefined,
  pid: string,
): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') return raw;
  return `${pid} ${raw.text}`;
}

// Función de comparación natural para desempate de IDs (T-10)
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Construye la lista de ReadyProcess ordenada para desempate (T-10)
function buildReadyList(
  ids: readonly string[],
  processes: readonly Process[],
  remaining: Map<string, number>,
): ReadyProcess[] {
  const list: ReadyProcess[] = ids.map((id) => {
    const p = processes.find((x) => x.id === id);
    if (p === undefined) throw new Error(`Proceso "${id}" no encontrado`);
    const rem = remaining.get(id) ?? p.burst_time;
    return {
      id: p.id,
      arrival_time: p.arrival_time,
      burst_time: p.burst_time,
      remaining: rem,
      ...(p.priority !== undefined ? { priority: p.priority } : {}),
    };
  });

  // Desempate global: arrival_time ascendente, luego naturalCompare de id
  list.sort((a, b) => a.arrival_time - b.arrival_time || naturalCompare(a.id, b.id));
  return list;
}

// Bucle principal de simulación — función privada única
//
// Modelo intra-tick:
// El HistoryEvent del tick T captura quién ejecuta DURANTE T.
// Orden de procesamiento:
// 1. Procesar llegadas + reencolado pendiente (quantum-expiry del tick anterior)
// 2. Decisión de reparto (select)
// 3. Registrar HistoryEvent (snapshot del estado DURANTE T)
// 4. Decrementar CPU y detectar fin de tramo para el SIGUIENTE tick
//
// Reencolado por quantum-expiry se efectúa DESPUÉS de las llegadas (según TECHNICAL.md T-15):
// io-return → llegadas → quantum-expiry
function executeSimulationLoop(
  initialState: LoopState,
  algo: IAlgorithm,
  processes: readonly Process[],
  quantum: number | undefined,
  boostInterval: number | undefined,
  initialRemaining?: ReadonlyMap<string, number>,
): HistoryEvent[] {
  const history: HistoryEvent[] = [];
  const remaining = new Map<string, number>();
  for (const p of processes) {
    remaining.set(p.id, p.burst_time);
  }
  if (initialRemaining !== undefined) {
    for (const [id, rem] of initialRemaining) {
      remaining.set(id, rem);
    }
  }

  let tick = initialState.tick;
  let onCPU: string | null = initialState.onCPU;
  const ready: string[] = [...initialState.ready];
  const completed: string[] = [...initialState.completed];

  // Ticks ejecutados por el proceso actual en su turno
  let ticksInSlice = 0;
  // Buffer de mensaje de salida del tick anterior para concatenación (T-18)
  let prevTickMessage: string | null = null;
  // Quantum asignado al proceso actual
  let currentSlice = 0;
  // ID del proceso cuyo quantum expiró al final del tick anterior (pendiente de reencolar)
  let pendingQuantumExpiry: string | null = null;

  // ── Soporte de E/S ──
  const hasIO = algo.requires.io === true;
  const ioSubsystem = new IOSubsystem();
  // Ticks acumulados en CPU por proceso (para detectar io_entry)
  const cpuAccum = new Map<string, number>();
  // Índice de la siguiente operación IO pendiente por proceso
  const ioOpIndex = new Map<string, number>();
  // PID que completó su E/S en el tick anterior (listo para reencolar)
  let pendingIoReturn: string | null = null;

  if (hasIO) {
    for (const p of processes) {
      cpuAccum.set(p.id, 0);
      ioOpIndex.set(p.id, 0);
    }
  }

  // Cambia el proceso en CPU: encola al actual, despacha al seleccionado y construye
  // el mensaje "salida. A continuación, entrada". `exitMsg` es el motivo de salida ya
  // resuelto (expropiación o priority-boost), o null si no hay texto de salida.
  // `setSlice` renueva el quantum del nuevo proceso (modos basados en quantum).
  // Centraliza el patrón repetido en las ramas on-better / io-return / on-quantum-and-better.
  const switchTo = (
    currentId: string,
    selected: ReadyProcess,
    exitMsg: string | null,
    setSlice: boolean,
  ): string => {
    ready.push(currentId);
    onCPU = selected.id;
    ready.splice(ready.indexOf(selected.id), 1);
    ticksInSlice = 0;
    if (setSlice) currentSlice = algo.quantumFor?.(selected) ?? quantum ?? 1;
    const raw = algo.onEvent?.({ type: 'dispatch', id: selected.id, tick }) ?? null;
    const entryMsg = resolveMsg(raw, selected.id) ?? `${selected.id} expropia a ${currentId}`;
    prevTickMessage = null;
    return exitMsg !== null ? `${exitMsg}. A continuación, ${entryMsg}` : entryMsg;
  };

  const TICK_LIMIT = 100_000;

  while (completed.length < processes.length) {
    if (tick > TICK_LIMIT) {
      throw new Error(`El simulador excedió el límite de ${String(TICK_LIMIT)} ticks.`);
    }

    let message = '';
    let hadIoReturn = false;

    if (hasIO) {
      // ── PASO 0b: Avanzar el subsistema de E/S (antes de comprobar io_entry) ──
      const ioCompleted = ioSubsystem.tick();
      if (ioCompleted !== null) {
        pendingIoReturn = ioCompleted;
      }

      // ── PASO 0a: Comprobar si onCPU alcanzó su io_entry ──
      if (onCPU !== null) {
        const pid = onCPU;
        const proc = processes.find((p) => p.id === pid);
        const idx = ioOpIndex.get(pid) ?? 0;
        const nextIO = proc?.io?.[idx];
        const acc = cpuAccum.get(pid) ?? 0;

        if (nextIO !== undefined && acc >= nextIO.io_entry) {
          algo.onEvent?.({ type: 'io-start', id: pid, tick });
          ioSubsystem.requestIO(pid, nextIO.io_time);
          ioOpIndex.set(pid, idx + 1);
          onCPU = null;
          ticksInSlice = 0;
          currentSlice = 0;
        }
      }

      // ── PASO 1 (E/S): io-returns antes que llegadas ──
      if (pendingIoReturn !== null) {
        const retId = pendingIoReturn;
        pendingIoReturn = null;
        hadIoReturn = true;
        algo.onEvent?.({ type: 'io-return', id: retId, tick });
        ready.push(retId);
      }
    }

    // ── PASO 1a: Llegadas en este tick ──
    const arrivals: string[] = [];
    for (const p of processes) {
      if (
        p.arrival_time === tick &&
        !completed.includes(p.id) &&
        !ready.includes(p.id) &&
        onCPU !== p.id &&
        p.id !== pendingQuantumExpiry
      ) {
        arrivals.push(p.id);
      }
    }
    arrivals.sort((a, b) => naturalCompare(a, b));
    for (const id of arrivals) {
      ready.push(id);
      algo.onEvent?.({ type: 'arrival', id, tick });
    }

    // ── PASO 1b: Reencolado por quantum-expiry del tick anterior (después de llegadas) ──
    if (pendingQuantumExpiry !== null) {
      const qExpId = pendingQuantumExpiry;
      const qExpRaw = algo.onEvent?.({ type: 'quantum-expiry', id: qExpId, tick }) ?? null;
      // Almacenar mensaje de salida para concatenación con el próximo dispatch (T-18)
      prevTickMessage = resolveMsg(qExpRaw, qExpId) ?? `${qExpId} agotó su quantum`;
      ready.push(qExpId);
      pendingQuantumExpiry = null;
    }

    // ── PASO 2: Decisión de reparto ──
    if (onCPU === null) {
      if (ready.length > 0) {
        const readyList = buildReadyList(ready, processes, remaining);
        const selected = algo.select(readyList);

        if (ready.includes(selected.id)) {
          onCPU = selected.id;
          ready.splice(ready.indexOf(selected.id), 1);
          ticksInSlice = 0;

          if (
            algo.preemptionMode === 'on-quantum' ||
            algo.preemptionMode === 'on-quantum-and-better' ||
            (algo.preemptionMode === 'io-return' &&
              (algo.quantumFor !== undefined || quantum !== undefined))
          ) {
            currentSlice = algo.quantumFor?.(selected) ?? quantum ?? 1;
          }

          const raw = algo.onEvent?.({ type: 'dispatch', id: selected.id, tick }) ?? null;
          const entryMsg = resolveMsg(raw, selected.id) ?? `${selected.id} entra en CPU`;
          message =
            prevTickMessage !== null
              ? `${prevTickMessage}. A continuación, ${entryMsg}`
              : entryMsg;
          prevTickMessage = null;
        } else {
          message = 'CPU inactiva';
          prevTickMessage = null;
        }
      } else {
        message = 'CPU inactiva';
        prevTickMessage = null;
      }
    } else if (algo.preemptionMode === 'on-better') {
      // T-12: reevaluar con on-better (incluyendo proceso actual como candidato)
      const currentId = onCPU;
      const candidateIds = [...ready, currentId];
      const readyList = buildReadyList(candidateIds, processes, remaining);
      const selected = algo.select(readyList);

      if (selected.id !== currentId) {
        const preemptRaw = algo.onEvent?.({ type: 'preempted', id: currentId, tick }) ?? null;
        message = switchTo(currentId, selected, resolveMsg(preemptRaw, currentId), false);
      } else {
        message = `${currentId} en CPU`;
      }
    } else if (algo.preemptionMode === 'io-return' && hadIoReturn) {
      // T-16: expropiación forzada cuando hay retorno de E/S
      const currentId = onCPU;
      const candidateIds = [...ready, currentId];
      const readyList = buildReadyList(candidateIds, processes, remaining);
      const selected = algo.select(readyList);

      if (selected.id !== currentId) {
        const preemptRaw = algo.onEvent?.({ type: 'preempted', id: currentId, tick }) ?? null;
        message = switchTo(currentId, selected, resolveMsg(preemptRaw, currentId), true);
      } else {
        message = `${currentId} en CPU`;
      }
    } else if (algo.preemptionMode === 'on-quantum-and-better') {
      // T-17: modo híbrido MLFQ — quantum + on-better (solo en llegadas) + priority-boost
      const currentId = onCPU;
      const boostNow =
        boostInterval !== undefined &&
        boostInterval > 0 &&
        tick > 0 &&
        tick % boostInterval === 0;

      if (boostNow) {
        // Emitir priority-boost; el algoritmo mueve todos al nivel 0
        const boostRaw = algo.onEvent?.({ type: 'priority-boost', tick }) ?? null;
        const boostMsg = resolveMsg(boostRaw, '') ?? 'priority boost';
        ticksInSlice = 0;
        // Re-evaluar incluyendo el proceso actual como candidato
        const candidateIds = [...ready, currentId];
        const readyList = buildReadyList(candidateIds, processes, remaining);
        const selected = algo.select(readyList);

        if (selected.id !== currentId) {
          message = switchTo(currentId, selected, boostMsg, true);
        } else {
          // El mismo proceso continúa con quantum renovado
          currentSlice = algo.quantumFor?.(selected) ?? quantum ?? 1;
          message = boostMsg;
        }
      } else if (arrivals.length > 0 || hadIoReturn) {
        // Reevaluar solo cuando haya llegadas nuevas o retornos de E/S
        const candidateIds = [...ready, currentId];
        const readyList = buildReadyList(candidateIds, processes, remaining);
        const selected = algo.select(readyList);

        if (selected.id !== currentId) {
          const preemptRaw = algo.onEvent?.({ type: 'preempted', id: currentId, tick }) ?? null;
          message = switchTo(currentId, selected, resolveMsg(preemptRaw, currentId), true);
        } else {
          message = `${currentId} en CPU`;
        }
      } else {
        message = `${currentId} en CPU`;
      }
    } else {
      message = `${onCPU} en CPU`;
    }

    // ── PASO 3: Registrar HistoryEvent (snapshot DURANTE este tick) ──
    const ioState = hasIO ? ioSubsystem.getState() : null;
    const levels = algo.levelSnapshot?.();
    history.push({
      tick,
      onCPU,
      ready: [...ready],
      pending: [],
      completed: [...completed],
      inIO: ioState?.serving ?? null,
      waitingIO: ioState ? [...ioState.queue] : [],
      message,
      ...(levels !== undefined ? { levels } : {}),
    });

    // ── PASO 4: Decrementar CPU y detectar fin de tramo ──
    if (onCPU !== null) {
      const rem = remaining.get(onCPU);
      if (rem !== undefined && rem > 0) {
        remaining.set(onCPU, rem - 1);
        ticksInSlice++;
        if (hasIO) {
          cpuAccum.set(onCPU, (cpuAccum.get(onCPU) ?? 0) + 1);
        }
      }

      const newRem = remaining.get(onCPU) ?? 0;

      if (newRem <= 0) {
        // Completación (prioridad sobre quantum expiry)
        const completedId = onCPU;
        const compRaw = algo.onEvent?.({ type: 'completed', id: completedId, tick }) ?? null;
        prevTickMessage = resolveMsg(compRaw, completedId) ?? `${completedId} completado`;
        completed.push(completedId);
        // T-20: Parchear el último HistoryEvent para que `completed` incluya este proceso
        const patchIdx = history.length - 1;
        const patchEv = history[patchIdx];
        if (patchEv !== undefined) {
          history[patchIdx] = { ...patchEv, completed: [...patchEv.completed, completedId] };
        }
        onCPU = null;
        ticksInSlice = 0;
        currentSlice = 0;
      } else if (
        (algo.preemptionMode === 'on-quantum' ||
          algo.preemptionMode === 'on-quantum-and-better' ||
          algo.preemptionMode === 'io-return') &&
        currentSlice > 0 &&
        ticksInSlice >= currentSlice
      ) {
        // Quantum expirado: diferir el reencolado al próximo tick (después de llegadas)
        // El mensaje se captura en PASO 1b cuando se emite onEvent('quantum-expiry')
        pendingQuantumExpiry = onCPU;
        onCPU = null;
        ticksInSlice = 0;
        currentSlice = 0;
      } else if (algo.preemptionMode === 'on-better') {
        // on-better: reevaluar al final del tick también (sin llegadas nuevas)
        const currentId = onCPU;
        const candidateIds = [...ready, currentId];
        if (candidateIds.length > 1) {
          const readyList = buildReadyList(candidateIds, processes, remaining);
          const selected = algo.select(readyList);
          if (selected.id !== currentId) {
            algo.onEvent?.({ type: 'preempted', id: currentId, tick });
            ready.push(currentId);
            onCPU = null;
            ticksInSlice = 0;
          }
        }
      }
    }

    tick++;
  }

  return history;
}

export { executeSimulationLoop };
export type { LoopState };
