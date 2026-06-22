import type { IAlgorithm, ReadyProcess, SchedulerEvent } from '../../types/algorithm.js';
import { FifoQueue } from '../shared/fifo-queue.js';

export class MultilevelFeedback implements IAlgorithm {
  readonly name = 'mlfq';
  readonly preemptionMode = 'on-quantum-and-better' as const;
  readonly requires = { priority: false, quantum: false, io: false };

  private levels: FifoQueue<string>[];
  private readonly processLevel = new Map<string, number>();
  private readonly quanta: number[];
  /** Contador de inserción para orden FIFO dentro de un nivel */
  private insertionCounter = 0;
  private readonly insertionOrder = new Map<string, number>();
  /** pid actualmente en CPU (para priority-boost) */
  private currentOnCPU: string | null = null;

  constructor(quanta: number[] = [2, 4, 8]) {
    this.quanta = quanta;
    this.levels = quanta.map(() => new FifoQueue<string>());
  }

  private lastLevel(): number {
    return this.quanta.length - 1;
  }

  private naturalCmp(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('select: cola vacía');

    // Ordenar por nivel (processLevel), luego por orden de inserción (FIFO), luego por id
    const sorted = [...ready].sort((a, b) => {
      const la = this.processLevel.get(a.id) ?? 0;
      const lb = this.processLevel.get(b.id) ?? 0;
      if (la !== lb) return la - lb;
      const oa = this.insertionOrder.get(a.id) ?? 0;
      const ob = this.insertionOrder.get(b.id) ?? 0;
      if (oa !== ob) return oa - ob;
      return this.naturalCmp(a.id, b.id);
    });

    const first = sorted[0];
    if (first === undefined) throw new Error('select: cola vacía');

    // Retirar de la cola de nivel correspondiente
    const level = this.processLevel.get(first.id) ?? 0;
    const q = this.levels[level];
    if (q !== undefined) {
      // Avanzar si la cabeza coincide
      if (q.peek() === first.id) q.dequeue();
    }

    return first;
  }

  quantumFor(p: ReadyProcess): number | null {
    const level = this.processLevel.get(p.id) ?? 0;
    return this.quanta[level] ?? null;
  }

  private enqueueAt(pid: string, level: number): void {
    this.processLevel.set(pid, level);
    this.insertionOrder.set(pid, this.insertionCounter++);
    this.levels[level]?.enqueue(pid);
  }

  onEvent(e: SchedulerEvent): string | null {
    switch (e.type) {
      case 'arrival':
        this.enqueueAt(e.id, 0);
        return null;

      case 'dispatch':
        this.currentOnCPU = e.id;
        return null;

      case 'quantum-expiry': {
        this.currentOnCPU = null;
        const current = this.processLevel.get(e.id) ?? 0;
        const next = Math.min(current + 1, this.lastLevel());
        this.enqueueAt(e.id, next);
        return `${e.id} se degrada al nivel ${String(next)}`;
      }

      case 'preempted': {
        this.currentOnCPU = null;
        const level = this.processLevel.get(e.id) ?? 0;
        // Vuelve a la cabeza de su nivel: reinsertar con orden inferior al actual mínimo
        const minOrder = Math.min(
          ...[...this.insertionOrder.values()].filter((_, i) => {
            const keys = [...this.insertionOrder.keys()];
            return this.processLevel.get(keys[i] ?? '') === level;
          }),
          this.insertionCounter,
        );
        this.processLevel.set(e.id, level);
        this.insertionOrder.set(e.id, minOrder - 1);
        this.levels[level]?.prepend(e.id);
        return null;
      }

      case 'priority-boost': {
        const cpuPid = this.currentOnCPU;
        this.currentOnCPU = null;

        // Recopilar todos los pids de todos los niveles
        const allPids: string[] = [];
        for (const q of this.levels) {
          allPids.push(...q.toArray());
        }
        if (cpuPid !== null && !allPids.includes(cpuPid)) {
          allPids.push(cpuPid);
        }

        // Limpiar colas y contadores
        this.levels = this.quanta.map(() => new FifoQueue<string>());
        this.insertionCounter = 0;
        this.insertionOrder.clear();

        // Ordenar por id (natural) y mover todos a nivel 0
        allPids.sort((a, b) => this.naturalCmp(a, b));
        for (const pid of allPids) {
          this.enqueueAt(pid, 0);
        }

        return 'priority boost: todos los procesos suben al nivel 0';
      }

      case 'completed':
        this.currentOnCPU = null;
        return null;

      default:
        return null;
    }
  }
}
