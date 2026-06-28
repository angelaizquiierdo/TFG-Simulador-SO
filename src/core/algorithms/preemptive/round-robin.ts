import type { IAlgorithm, ReadyProcess, SchedulerEvent } from '../../../core/types/algorithm.js';

export class RoundRobin implements IAlgorithm {
  readonly name = 'round-robin';
  readonly preemptionMode = 'on-quantum' as const;
  readonly requires = { quantum: true } as const;

  private readonly queue: string[] = [];

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // Usar la cola interna FIFO para el orden correcto
    for (const id of this.queue) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) return found;
    }
    // Fallback: primer elemento de la lista ordenada por el motor
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    return first;
  }

  onEvent(e: SchedulerEvent): string | null {
    if (e.type === 'arrival') {
      this.queue.push(e.id);
    } else if (e.type === 'quantum-expiry') {
      const idx = this.queue.indexOf(e.id);
      if (idx !== -1) this.queue.splice(idx, 1);
      this.queue.push(e.id);
    } else if (e.type === 'completed') {
      const idx = this.queue.indexOf(e.id);
      if (idx !== -1) this.queue.splice(idx, 1);
    }
    return null;
  }
}
