import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Prioridad expropiativa: selecciona el proceso con menor número de prioridad
// (menor número = mayor prioridad). Procesos sin priority se tratan como Infinity.
export class PriorityP implements IAlgorithm {
  readonly name = 'priority-p';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = { priority: true };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const initial = ready[0];
    if (initial === undefined) {
      throw new Error('select() llamado con la cola de listos vacía');
    }
    let best = initial;
    let bestPrioVal = initial.priority ?? Infinity;
    for (const p of ready) {
      const prio = p.priority ?? Infinity;
      if (prio < bestPrioVal) {
        best = p;
        bestPrioVal = prio;
      }
    }
    return best;
  }
}
