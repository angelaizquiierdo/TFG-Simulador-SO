import type { IAlgorithm, ReadyProcess, SchedulerEvent, PreemptionTrigger } from '../../../core/types/algorithm.js';
import { FifoQueue } from '../shared/fifo-queue.js';

/**
 * Round Robin Virtual (VRR).
 *
 * Dos colas: auxQueue (prioridad alta) y mainQueue (prioridad normal).
 * - Llegada nueva → mainQueue.
 * - Agota quantum → mainQueue.
 * - Bloqueo por E/S antes de agotar quantum → al volver, auxQueue con sobrante.
 *   Si sobrante = 0 → mainQueue.
 * - select: cabeza de auxQueue si no vacía; si no, cabeza de mainQueue.
 * - quantumFor: sobrante (auxQueue) | null → motor aplica config.quantum (mainQueue).
 * - Expropiación: si hay proceso en auxQueue y CPU viene de mainQueue → preempt.
 *
 * Acepta `configuredQuantum` en el constructor para calcular sobrante correctamente
 * en procesos despachados desde mainQueue que se bloquean antes de agotar el quantum.
 */
export class VirtualRoundRobin implements IAlgorithm {
  readonly name = 'virtual-round-robin';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>([
    'on-quantum',
    'on-io-return',
  ]);
  readonly requires = { io: true, quantum: true } as const;

  private mainQueue = new FifoQueue<string>();
  private auxQueue = new FifoQueue<string>();

  // Sobrante de quantum para procesos en cola auxiliar (antes de io-return)
  private pendingSlice = new Map<string, number>();
  // Quantum asignado al proceso en CPU en el momento del dispatch
  private dispatchedSlice = new Map<string, number>();
  // Tick en que se emitió dispatch (para calcular ticks_run en io-start)
  private dispatchTick = new Map<string, number>();
  // Última selección: ¿vino de auxQueue? (para quantumFor)
  private lastDispatchedFromAux = false;
  // PID del proceso actualmente en CPU
  private currentCpuPid: string | null = null;
  // ¿El proceso en CPU fue despachado desde auxQueue?
  private currentCpuFromAux = false;

  // Quantum configurado externamente (equivalente a config.quantum en el motor)
  private readonly configuredQuantum: number;

  constructor(quantum = 1) {
    this.configuredQuantum = quantum;
  }

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');

    // Regla de expropiación (spec T-34): solo se expropia cuando el proceso en CPU
    // fue despachado desde la cola PRINCIPAL. Si vino de la cola auxiliar,
    // mantiene la CPU (no cede ante nuevas llegadas a auxQueue).
    if (this.currentCpuFromAux && this.currentCpuPid !== null) {
      const current = ready.find((p) => p.id === this.currentCpuPid);
      if (current !== undefined) {
        this.lastDispatchedFromAux = true;
        return current;
      }
    }

    // Prioridad 0: cola auxiliar
    for (const id of this.auxQueue.toArray()) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) {
        this.lastDispatchedFromAux = true;
        return found;
      }
    }

    // Prioridad 1: cola principal
    for (const id of this.mainQueue.toArray()) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) {
        this.lastDispatchedFromAux = false;
        return found;
      }
    }

    // Fallback (no debería ocurrir con gestión correcta)
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    this.lastDispatchedFromAux = false;
    return first;
  }

  quantumFor(p: ReadyProcess): number | null {
    if (this.lastDispatchedFromAux) {
      const slice = this.pendingSlice.get(p.id);
      return slice !== undefined && slice > 0 ? slice : null;
    }
    // Cola principal → el motor aplica config.quantum
    return null;
  }

  onEvent(e: SchedulerEvent): { text: string } | null {
    switch (e.type) {
      case 'arrival': {
        this.mainQueue.enqueue(e.id);
        return null;
      }

      case 'dispatch': {
        const fromAux = this.lastDispatchedFromAux;
        this._removeFromQueues(e.id);
        this.dispatchTick.set(e.id, e.tick);
        const assignedSlice = fromAux
          ? (this.pendingSlice.get(e.id) ?? 0)
          : this.configuredQuantum;
        this.dispatchedSlice.set(e.id, assignedSlice);
        // Limpiar pendingSlice: ya se consumió en el dispatch
        if (fromAux) {
          this.pendingSlice.delete(e.id);
        }
        // Registrar qué proceso está en CPU y si vino de auxQueue
        this.currentCpuPid = e.id;
        this.currentCpuFromAux = fromAux;
        return {
          text: fromAux
            ? `toma la CPU desde la cola auxiliar`
            : `toma la CPU desde la cola principal`,
        };
      }

      case 'quantum-expiry': {
        // Agotó el quantum → cola principal
        this.pendingSlice.delete(e.id);
        this.dispatchedSlice.delete(e.id);
        this.mainQueue.enqueue(e.id);
        this.currentCpuPid = null;
        this.currentCpuFromAux = false;
        return { text: 'agotó su quantum' };
      }

      case 'preempted': {
        // Expropiado → vuelve a la cola principal
        this.dispatchedSlice.delete(e.id);
        this.mainQueue.enqueue(e.id);
        this.currentCpuPid = null;
        this.currentCpuFromAux = false;
        return { text: 'fue expropiado' };
      }

      case 'io-start': {
        // Calcular sobrante: ticks_run = e.tick - dispatchTick
        // io-start se emite al INICIO del tick e.tick, ANTES del historial.
        // El proceso corrió durante [dispatchTick, e.tick - 1], es decir e.tick - dispatchTick ticks.
        const dTick = this.dispatchTick.get(e.id) ?? e.tick;
        const assignedQ = this.dispatchedSlice.get(e.id) ?? this.configuredQuantum;
        const ticksRun = e.tick - dTick;
        const sobrante = assignedQ - ticksRun;
        if (sobrante > 0) {
          this.pendingSlice.set(e.id, sobrante);
        } else {
          this.pendingSlice.delete(e.id);
        }
        this.dispatchedSlice.delete(e.id);
        this.dispatchTick.delete(e.id);
        // El proceso abandona la CPU hacia E/S
        this.currentCpuPid = null;
        this.currentCpuFromAux = false;
        return { text: 'se bloquea por E/S' };
      }

      case 'io-return': {
        const sobrante = this.pendingSlice.get(e.id);
        if (sobrante !== undefined && sobrante > 0) {
          this.auxQueue.enqueue(e.id);
          return { text: `se inserta en la cola auxiliar con sobrante de ${String(sobrante)}` };
        } else {
          this.pendingSlice.delete(e.id);
          this.mainQueue.enqueue(e.id);
          return { text: 're-encola en la cola principal' };
        }
      }

      case 'completed': {
        this._removeFromQueues(e.id);
        this.pendingSlice.delete(e.id);
        this.dispatchedSlice.delete(e.id);
        this.dispatchTick.delete(e.id);
        this.currentCpuPid = null;
        this.currentCpuFromAux = false;
        return null;
      }

      default:
        return null;
    }
  }

  // Snapshot pid → cola para anotar el Gantt: cola 0 = auxiliar (vuelve de E/S con
  // sobrante), cola 1 = principal (RR con quantum). El proceso en CPU no está en las
  // colas; se etiqueta según de dónde fue despachado.
  levelSnapshot(): Readonly<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const id of this.auxQueue.toArray()) out[id] = 0;
    for (const id of this.mainQueue.toArray()) out[id] = 1;
    if (this.currentCpuPid !== null) {
      out[this.currentCpuPid] = this.currentCpuFromAux ? 0 : 1;
    }
    return out;
  }

  private _removeFromQueues(id: string): void {
    const auxArr = this.auxQueue.toArray().filter((x) => x !== id);
    const mainArr = this.mainQueue.toArray().filter((x) => x !== id);
    this.auxQueue = new FifoQueue<string>();
    this.mainQueue = new FifoQueue<string>();
    for (const x of auxArr) this.auxQueue.enqueue(x);
    for (const x of mainArr) this.mainQueue.enqueue(x);
  }
}
