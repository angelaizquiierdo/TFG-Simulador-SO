import type { IAlgorithm, ReadyProcess, SchedulerEvent, PreemptionTrigger } from '../../../core/types/algorithm.js';

export class RoundRobin implements IAlgorithm {
  readonly name = 'round-robin';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>(['on-quantum']);
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

  // Además de mantener la cola FIFO interna, produce mensajes descriptivos del Gantt:
  // dispatch explica por qué entra (cabeza de la cola Round Robin) y quantum-expiry el
  // motivo de salida. El motor antepone el PID a { text } (mismo patrón que VRR/MLFQ).
  onEvent(e: SchedulerEvent): { text: string } | null {
    if (e.type === 'arrival') {
      this.queue.push(e.id);
      return null;
    } else if (e.type === 'dispatch') {
      return { text: 'entra en CPU por ser el primer proceso de la cola Round Robin' };
    } else if (e.type === 'quantum-expiry') {
      const idx = this.queue.indexOf(e.id);
      if (idx !== -1) this.queue.splice(idx, 1);
      this.queue.push(e.id);
      return { text: 'agota su quantum y vuelve al final de la cola' };
    } else if (e.type === 'completed') {
      const idx = this.queue.indexOf(e.id);
      if (idx !== -1) this.queue.splice(idx, 1);
    }
    return null;
  }
}
