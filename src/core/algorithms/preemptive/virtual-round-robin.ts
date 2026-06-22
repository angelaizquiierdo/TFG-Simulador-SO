import type { IAlgorithm, ReadyProcess, SchedulerEvent } from '../../types/algorithm.js';
import { FifoQueue } from '../shared/fifo-queue.js';

export class VirtualRoundRobin implements IAlgorithm {
  readonly name = 'vrr';
  readonly preemptionMode = 'io-return' as const;
  readonly requires = { priority: false, quantum: true, io: true };

  private readonly mainQueue  = new FifoQueue<string>();
  private readonly auxQueue   = new FifoQueue<string>();
  /** Sobrante almacenado para procesos que volvieron de E/S antes de agotar su quantum */
  private readonly sliceMap   = new Map<string, number>();

  /** Quantum del despacho actual (para calcular sobrante en io-start) */
  private dispatchTick    = 0;
  private dispatchQuantum = 0;
  /** Quantum por defecto (se usa para procesos desde mainQueue) */
  private readonly quantum: number;

  constructor(quantum = 4) {
    this.quantum = quantum;
  }

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('select: cola vacía');
    const readySet = new Set(ready.map(p => p.id));

    // Auxiliar tiene prioridad
    while (!this.auxQueue.isEmpty()) {
      const pid = this.auxQueue.peek();
      if (pid !== undefined && readySet.has(pid)) {
        this.auxQueue.dequeue();
        return ready.find(p => p.id === pid) ?? (() => { throw new Error('unreachable'); })();
      }
      this.auxQueue.dequeue(); // pid ya no está en ready, descartar
    }

    while (!this.mainQueue.isEmpty()) {
      const pid = this.mainQueue.peek();
      if (pid !== undefined && readySet.has(pid)) {
        this.mainQueue.dequeue();
        return ready.find(p => p.id === pid) ?? (() => { throw new Error('unreachable'); })();
      }
      this.mainQueue.dequeue();
    }

    const first = ready[0];
    if (first === undefined) throw new Error('select: cola vacía');
    return first;
  }

  quantumFor(p: ReadyProcess): number | null {
    const slice = this.sliceMap.get(p.id);
    return slice !== undefined && slice > 0 ? slice : this.quantum;
  }

  onEvent(e: SchedulerEvent): string | null {
    switch (e.type) {
      case 'arrival':
        this.mainQueue.enqueue(e.id);
        return null;

      case 'dispatch': {
        const slice = this.sliceMap.get(e.id);
        this.dispatchQuantum = slice !== undefined && slice > 0 ? slice : this.quantum;
        this.sliceMap.delete(e.id);
        this.dispatchTick = e.tick;
        return null;
      }

      case 'io-start': {
        // e.tick = tick_actual + 1 (el motor emite con tick+1)
        const ticksUsed = e.tick - this.dispatchTick;
        const remaining = this.dispatchQuantum - ticksUsed;
        if (remaining > 0) {
          this.sliceMap.set(e.id, remaining);
        }
        return null;
      }

      case 'io-return': {
        const slice = this.sliceMap.get(e.id);
        if (slice !== undefined && slice > 0) {
          this.auxQueue.enqueue(e.id);
          return `${e.id} se inserta en la cola auxiliar con sobrante de ${String(slice)}`;
        }
        this.mainQueue.enqueue(e.id);
        return `${e.id} regresa a la cola principal`;
      }

      case 'quantum-expiry':
        this.mainQueue.enqueue(e.id);
        return `${e.id} regresa a la cola principal (quantum agotado)`;

      case 'preempted':
        this.mainQueue.enqueue(e.id);
        return null;

      default:
        return null;
    }
  }
}
